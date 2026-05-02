const chatModel = require('../models/chat.model');
const chatBotModel = require('../models/chatbot.model');
const ticketModel = require('../models/ticket.model');
const leadModel = require('../models/lead.model');

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

        const lead = await leadModel.create({
            companyId: chatbot.companyId,
            name,
            email,
            note: `lead captured from chatbot ${chatbotId}`
        })

        res.status(201).json({
            success: true,
            message: "Chat initialized",
            data: {
                chatId: chat._id
            },
            lead
        });
    } catch (error) {
        console.error("Init Chat Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
}

async function createPublicTicket(req, res) {
    try {
        const { name, email, inquiree, chatId } = req.body;

        if (!email || !inquiree) {
            return res.status(400).json({ success: false, message: "Email and inquiree are required" });
        }

        const chat = await chatModel.findById(chatId);
        const chatbot = await chatBotModel.findById(chat.chatbotId);

        const ticket = await ticketModel.create({
            companyId: chatbot.companyId,
            name,
            email,
            inquiree,
            chatId,
            status: 'open',
            priority: 'medium',
            type: 'chatbot'
        });

        // Update chat session with user identity from the form
        if (chatId) {
            await chatModel.findByIdAndUpdate(chatId, {
                $set: { 
                    ...(name && { name }), 
                    ...(email && { email }) 
                }
            });
        }

        res.status(201).json({
            success: true,
            message: "Ticket created successfully",
            data: ticket
        });
    } catch (error) {
        console.error("Public Ticket Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
}

module.exports = { initChat, createPublicTicket };
