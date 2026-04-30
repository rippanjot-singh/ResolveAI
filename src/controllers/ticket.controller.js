const userModel = require("../models/user.model");
const ticketModel = require("../models/ticket.model");
const { updateTicketSchema } = require("../validators/ticket.validator");

async function createTicketController(req, res){
    try {
        const {userId} = req.user;
        const { name, email, inquiree, assignedTo, priority, priorityLevel } = req.body;

        const user = await userModel.findOne({_id: userId});
        if (user.role !== 'admin' && assignedTo) {
            return res.status(403).json({
                message: "Only admin can assign tickets"
            });
        }

        const ticket = await ticketModel.create({
            name,
            email,
            inquiree,
            assignedTo,
            priority,
            priorityLevel
        });
        
        return res.status(201).json({
            message: "Ticket created successfully",
            ticket
        });

    } catch (error) {
        return res.status(500).json({
            message: "Internal server error",
            error: error.message
        })
    }
}

async function getAllTicketsController(req, res){
    try {
        const tickets = await ticketModel.find();
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

async function getTicketController(req, res){
    try {
        const {ticketId} = req.params;
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

async function deleteTicketController(req, res){
    try {
        const {ticketId} = req.params;
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

module.exports = {
    createTicketController,
    getAllTicketsController,
    getTicketController,
    deleteTicketController,
    updateTicketController
};