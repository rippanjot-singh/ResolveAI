const userModel = require("../models/user.model");
const ticketModel = require("../models/ticket.model");
const { updateTicketSchema } = require("../validators/ticket.validator");
const sendMail = require("../services/email.service");
const { chatRag } = require("../services/rag.service");
const leadModel = require("../models/lead.model");
const { getIO } = require("../utils/socket");

async function createTicketController(req, res) {
    try {
        const { userId, companyId } = req.user;
        const { name, email, inquiree, assignedTo, priority, priorityLevel } = req.body;

        const user = await userModel.findOne({ _id: userId });
        if (user.role !== 'admin' && assignedTo) {
            return res.status(403).json({
                message: "Only admin can assign tickets"
            });
        }

        const ticket = await ticketModel.create({
            companyId,
            name,
            email,
            inquiree,
            assignedTo,
            priority,
            priorityLevel
        });

        const lead = await leadModel.create({
            companyId,
            name,
            email,
            note: `lead created manually. [TICKET: ${ticket._id}] [INQUIREE: ${inquiree}]`
        })

        // Emit socket event to company room
        try {
            getIO().to(companyId.toString()).emit('new_ticket', ticket);
        } catch (err) {
            console.error('Socket emit error:', err);
        }

        return res.status(201).json({
            message: "Ticket created successfully",
            ticket,
            lead
        });

    } catch (error) {
        return res.status(500).json({
            message: "Internal server error",
            error: error.message
        })
    }
}

async function getAllTicketsController(req, res) {
    try {
        const { companyId } = req.user;
        const tickets = await ticketModel.find({ companyId });
        return res.status(200).json({
            message: "Tickets fetched successfully",
            tickets
        });
    } catch (error) {
        return res.status(500).json({
            message: "Internal server error",
            error: error.message
        })
    }
}

async function getTicketController(req, res) {
    try {
        const { ticketId } = req.params;
        const ticket = await ticketModel.findById(ticketId);
        return res.status(200).json({
            message: "Ticket fetched successfully",
            ticket
        });
    } catch (error) {
        return res.status(500).json({
            message: "Internal server error",
            error: error.message
        })
    }
}

async function deleteTicketController(req, res) {
    try {
        const { ticketId } = req.params;
        const ticket = await ticketModel.findByIdAndDelete(ticketId);
        return res.status(200).json({
            message: "Ticket deleted successfully",
            ticket
        });
    } catch (error) {
        return res.status(500).json({
            message: "Internal server error",
            error: error.message
        })
    }
}

async function updateTicketController(req, res) {
    try {
        const { ticketId } = req.params;
        const validatedData = updateTicketSchema.parse(req.body);

        const ticket = await ticketModel.findByIdAndUpdate(
            ticketId,
            { $set: validatedData },
            { new: true, runValidators: true }
        );

        if (!ticket) {
            return res.status(404).json({
                message: "Ticket not found",
                status: "failed"
            });
        }

        return res.status(200).json({
            message: "Ticket updated successfully",
            status: "success",
            ticket
        });

    } catch (error) {
        if (error.name === 'ZodError') {
            return res.status(400).json({
                message: error.errors[0].message,
                status: "failed"
            });
        }
        return res.status(500).json({
            message: "Internal server error",
            status: "failed",
            error: error.message
        });
    }
}

async function resolveTicketController(req, res) {
    try {
        const { ticketId } = req.params;
        const { subject, html, response } = req.body;
        const { userId } = req.user;
        const user = await userModel.findById(userId);

        const ticket = await ticketModel.findById(ticketId);
        if (!ticket) {
            return res.status(404).json({
                message: "Ticket not found",
                status: "failed"
            });
        }

        const replyContent = html || response;

        // sendMail signature: to, subject, text, html
        // passing plain text version as 3rd arg, HTML as 4th arg
        await sendMail(ticket.email, subject, replyContent, replyContent);

        const updatedTicket = await ticketModel.findByIdAndUpdate(
            ticketId,
            {
                $set: { status: "closed", response: replyContent }
            },
            { new: true, runValidators: true }
        );

        chatRag(ticket.inquiree, replyContent, user.companyId)

        // Emit socket event
        try {
            getIO().to(user.companyId.toString()).emit('ticket_updated', updatedTicket);
        } catch (err) {
            console.error('Socket emit error:', err);
        }

        return res.status(200).json({
            message: "Ticket resolved successfully",
            status: "success",
            updatedTicket
        });
    } catch (error) {
        res.status(500).json({
            message: "Internal server error",
            error: error.message
        });
    }
}

module.exports = {
    createTicketController,
    getAllTicketsController,
    getTicketController,
    deleteTicketController,
    updateTicketController,
    resolveTicketController
};