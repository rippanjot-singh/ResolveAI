const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema({
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
        required: true
    },
    type:{
        type: String,
        enum: ['chatbot', 'form', 'email', 'other'],
        default: 'chatbot'
    }
}, { timestamps: true });

const ticketModel = mongoose.model('ticket', ticketSchema);

module.exports = ticketModel;