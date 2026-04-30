const chatModel = require('../models/chat.model');
const chatBotModel = require('../models/chatbot.model');

async function initChat(req, res) {
    try {
        const { name, email, chatbotId } = req.body;

        if (!chatbotId) {
            return res.status(400).json({ success: false, message: "Chatbot ID is required" });
        }

        const chatbot = await chatBotModel.findById(chatbotId);
        if (!chatbot) {
            return res.status(404).json({ success: false, message: "Chatbot not found" });
        }

        const chat = await chatModel.create({
            chatbotId,
            name,
            email
        });

        res.status(201).json({
            success: true,
            message: "Chat initialized",
            data: {
                chatId: chat._id
            }
        });
    } catch (error) {
        console.error("Init Chat Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
}

module.exports = { initChat };
