const userModel = require("../models/user.model");
const ticketModel = require("../models/ticket.model");
const mongoose = require("mongoose");
const { updateTicketSchema } = require("../validators/ticket.validator");
const sendMail = require("../services/email.service");
const { chatRag } = require("../services/rag.service");
const leadModel = require("../models/lead.model");
const { getIO } = require("../utils/socket");
const { autoAssignTicket } = require("../services/assignment.service");

async function createTicketController(req, res) {
    try {
        const { userId, companyId } = req.user;
        const { name, email, inquiree, assignedTo, priority, priorityLevel } = req.body;

        const user = await userModel.findOne({ _id: userId });
        
        let finalAssignedTo = assignedTo;

        // If no assignment provided, trigger AI auto-assignment
        if (!finalAssignedTo) {
            finalAssignedTo = await autoAssignTicket({ name, email, inquiree, priority }, companyId);
        }

        if (user.role !== 'admin' && assignedTo && assignedTo !== userId) {
            return res.status(403).json({
                message: "Only admin can assign tickets to others"
            });
        }

        const ticket = await ticketModel.create({
            companyId,
            name,
            email,
            inquiree,
            assignedTo: finalAssignedTo,
            priority,
            priorityLevel,
            type: 'manual'
        });

        const lead = await leadModel.create({
            companyId,
            name,
            email,
            note: `lead created manually. [TICKET: ${ticket._id}] [INQUIREE: ${inquiree}]`
        })

        // Emit socket event to company room
        try {
            const io = getIO();
            const room = companyId.toString();
            io.to(room).emit('new_ticket', ticket);
            io.to(room).emit('new_lead', lead);
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
        const { companyId, userId, role } = req.user;
        
        // Visibility Logic: Admins see all, Members see only assigned
        const matchStage = { 
            companyId: new mongoose.Types.ObjectId(companyId) 
        };

        if (role !== 'admin') {
            matchStage.assignedTo = new mongoose.Types.ObjectId(userId);
        }

        const tickets = await ticketModel.aggregate([
            { $match: matchStage },
            {
                $addFields: {
                    priorityWeight: {
                        $switch: {
                            branches: [
                                { case: { $eq: ["$priority", "high"] }, then: 3 },
                                { case: { $eq: ["$priority", "medium"] }, then: 2 },
                                { case: { $eq: ["$priority", "low"] }, then: 1 }
                            ],
                            default: 0
                        }
                    },
                    statusWeight: {
                        $switch: {
                            branches: [
                                { case: { $eq: ["$status", "open"] }, then: 3 },
                                { case: { $eq: ["$status", "pending"] }, then: 2 },
                                { case: { $eq: ["$status", "closed"] }, then: 1 }
                            ],
                            default: 0
                        }
                    }
                }
            },
            { $sort: { statusWeight: -1, priorityWeight: -1, createdAt: 1 } }
        ]);
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
        const { companyId, userId, role } = req.user;
        
        const ticket = await ticketModel.findOne({ 
            _id: ticketId,
            companyId: companyId
        });

        if (!ticket) {
            return res.status(404).json({ message: "Ticket not found" });
        }

        // Member check: Must be assigned to them
        if (role !== 'admin' && ticket.assignedTo?.toString() !== userId) {
            return res.status(403).json({ message: "You don't have permission to view this ticket" });
        }

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
        const { userId, role, companyId } = req.user;
        const validatedData = updateTicketSchema.parse(req.body);

        const ticket = await ticketModel.findOne({ 
            _id: ticketId,
            companyId: companyId
        });

        if (!ticket) {
            return res.status(404).json({
                message: "Ticket not found",
                status: "failed"
            });
        }

        // Member check: Must be assigned to them
        if (role !== 'admin' && ticket.assignedTo?.toString() !== userId) {
            return res.status(403).json({
                message: "You don't have permission to update this ticket",
                status: "failed"
            });
        }

        const updatedTicket = await ticketModel.findByIdAndUpdate(
            ticketId,
            { $set: validatedData },
            { new: true, runValidators: true }
        );

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
        const mailSubject = subject || `Resolution: Your Inquiry #${ticketId.slice(-6).toUpperCase()}`;

        // sendMail signature: to, subject, text, html
        // passing plain text version as 3rd arg, HTML as 4th arg
        await sendMail(ticket.email, mailSubject, replyContent, replyContent);

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

async function bulkDeleteTicketsController(req, res) {
    try {
        const { ticketIds } = req.body;
        if (!ticketIds || !Array.isArray(ticketIds)) {
            return res.status(400).json({
                message: "Ticket IDs array is required",
                status: "failed"
            });
        }

        await ticketModel.deleteMany({ _id: { $in: ticketIds } });

        return res.status(200).json({
            message: "Tickets deleted successfully",
            status: "success"
        });
    } catch (error) {
        return res.status(500).json({
            message: "Internal server error",
            status: "failed",
            error: error.message
        });
    }
}

module.exports = {
    createTicketController,
    getAllTicketsController,
    getTicketController,
    deleteTicketController,
    bulkDeleteTicketsController,
    updateTicketController,
    resolveTicketController
};