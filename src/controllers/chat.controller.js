const chatModel = require('../models/chat.model');
const chatBotModel = require('../models/chatbot.model');
const ticketModel = require('../models/ticket.model');
const leadModel = require('../models/lead.model');
const interactionModel = require('../models/interaction.model');

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

async function getAllChats(req, res) {
    try {
        const { companyId } = req.user;
        
        // Find all chatbots for this company
        const chatbots = await chatBotModel.find({ companyId });
        const chatbotIds = chatbots.map(cb => cb._id);

        const chats = await chatModel.find({ 
            chatbotId: { $in: chatbotIds } 
        }).populate('chatbotId', 'name').sort({ createdAt: -1 });

        // Add interaction count for each chat
        const chatsWithStats = await Promise.all(chats.map(async (chat) => {
            const interactionCount = await interactionModel.countDocuments({ chatId: chat._id });
            return {
                ...chat.toObject(),
                interactionCount
            };
        }));

        res.status(200).json({
            success: true,
            data: chatsWithStats
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
}

async function getChatInteractions(req, res) {
    try {
        const { chatId } = req.params;
        const { companyId } = req.user;

        // Verify chat belongs to user's company
        const chat = await chatModel.findById(chatId);
        if (!chat) return res.status(404).json({ success: false, message: "Chat not found" });

        const chatbot = await chatBotModel.findOne({ _id: chat.chatbotId, companyId });
        if (!chatbot) return res.status(403).json({ success: false, message: "Unauthorized" });

        const interactions = await interactionModel.find({ chatId }).sort({ createdAt: 1 });

        res.status(200).json({
            success: true,
            data: {
                chat,
                interactions
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
}

module.exports = { initChat, createPublicTicket, getAllChats, getChatInteractions };
