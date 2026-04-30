const mongoose = require('mongoose');

const interactionSchema = new mongoose.Schema({
    chatbotId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'chatBot',
        required: true
    },
    chatId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'chat',
        required: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        required: true
    },
    question: {
        type: String,
        required: true
    },
    answer: {
        type: String,
    },
    sentiment: {
        type: String,
        enum: ['positive', 'negative', 'neutral', 'unknown']
    },
    topic: {
        type: String,
        required: true
    }
}, { timestamps: true });

const interactionModel = mongoose.model('interaction', interactionSchema);

module.exports = interactionModel;