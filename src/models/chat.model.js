const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema({
    chatbotId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'chatBot',
        required: true
    },
    name: {
        type: String,
    },
    email: {
        type: String,
    }
}, { timestamps: true });

const chatModel = mongoose.model('chat', chatSchema);

module.exports = chatModel;