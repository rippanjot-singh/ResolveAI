const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema({
    companyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'company',
        required: true
    },
    name: {
        type: String
    },
    email: {
        type: String,
        required: true
    },
    inquiree: {
        type: String,
    },
    assignedTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
    },
    chatId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'chat',
    },
    status:{
        type: String,
        enum: ['open', 'closed', 'in-progress'],
        default: 'open'
    },
    priority:{
        type: String,
        enum: ['low', 'medium', 'high'],
        default: 'medium'
    },
    priorityLevel:{
        type: Number,
    },
    type: {
        type: String,
        enum: ['chatbot', 'form', 'email', 'manual', 'other'],
        default: 'manual'
    },
    response: {
        type: String,
    }
}, { timestamps: true });

ticketSchema.pre('save', async function() {
    if (this.isNew && !this.assignedTo) {
        try {
            const { autoAssignTicket } = require('../services/assignment.service');
            const assignedId = await autoAssignTicket({
                name: this.name,
                email: this.email,
                inquiree: this.inquiree,
                priority: this.priority
            }, this.companyId);
            
            if (assignedId) {
                this.assignedTo = assignedId;
            }
        } catch (error) {
            console.error("[TicketModel] Auto-assignment failed in pre-save:", error);
        }
    }
});

const ticketModel = mongoose.model('ticket', ticketSchema);

module.exports = ticketModel;