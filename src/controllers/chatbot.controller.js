const chatBotModel = require("../models/chatbot.model");
const { isDomainVerified } = require("../utils/domain.utils");

async function createChatbotController(req, res) {
    try {
        const { userId, companyId } = req.user;
        const { name } = req.body;

        const chatBot = await chatBotModel.create({
            companyId: companyId,
            userId: userId,
            name: name,
        })
        return res.status(201).json({ success: true, message: "Chatbot created  successfully", status: "success", chatBot });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message, status: "failed" });
    }
}

async function getMyChatbotsController(req, res) {
    try {
        const { companyId } = req.user;
        const chatbots = await chatBotModel.find({ companyId });
        return res.status(200).json({ success: true, message: "Chatbots fetched successfully", status: "success", chatbots });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message, status: "failed" });
    }
}

const { updateChatbotSchema } = require("../validators/chatbot.validator");

async function updateChatbotController(req, res) {
    try {
        const { companyId } = req.user;
        const { id } = req.params;

        // Check if chatbot exists and belongs to the company
        const chatbot = await chatBotModel.findOne({ _id: id, companyId });
        if (!chatbot) {
            return res.status(404).json({ success: false, message: "Chatbot not found or unauthorized", status: "failed" });
        }

        // Validate request body
        const validatedData = updateChatbotSchema.parse(req.body);

        // Update chatbot - use findByIdAndUpdate for atomic update
        // Note: For deep partial updates of nested objects, we should ideally flatten the object
        // but for now we'll perform the update directly. 
        // If the user wants to update nested fields, they should provide the parent object.
        const updatedChatbot = await chatBotModel.findByIdAndUpdate(
            id,
            { $set: validatedData },
            { new: true, runValidators: true }
        );

        return res.status(200).json({ 
            success: true, 
            message: "Chatbot updated successfully", 
            status: "success", 
            chatBot: updatedChatbot 
        });

    } catch (error) {
        if (error.name === 'ZodError') {
            return res.status(400).json({ success: false, message: error.errors[0].message, status: "failed" });
        }
        return res.status(500).json({ success: false, message: error.message, status: "failed" });
    }
}

async function deleteChatbotController(req, res) {
    try {
        const { companyId } = req.user;
        const { id } = req.params;

        // Check if chatbot exists and belongs to the company
        const chatbot = await chatBotModel.findOne({ _id: id, companyId });
        if (!chatbot) {
            return res.status(404).json({ success: false, message: "Chatbot not found or unauthorized", status: "failed" });
        }

        // Delete chatbot
        await chatBotModel.findByIdAndDelete(id);

        return res.status(200).json({ success: true, message: "Chatbot deleted successfully", status: "success" });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message, status: "failed" });
    }
}

async function getWidgetConfigController(req, res) {
    try {
        const chatbot = await chatBotModel.findById(req.params.id).select("name userId style welcomeMessage prompt model integrations position faq greeting verifiedDomains restrictedDomains isActive isMaster");
        if (!chatbot) return res.status(404).json({ success: false, message: "Not found" });

        // Explicitly block the widget from even loading its config on restricted domains
        if (!isDomainVerified(req, chatbot)) {
            return res.status(403).json({ success: false, message: "Widget disabled for this domain." });
        }

        res.status(200).json({ success: true, data: chatbot });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
}

async function toggleChatBotStatusController(req, res) {
    try {
        const chatbot = await chatBotModel.findOne({ _id: req.params.id, companyId: req.user.companyId });
        if (!chatbot) return res.status(404).json({ success: false, message: "Not found" });

        chatbot.isActive = !chatbot.isActive;
        await chatbot.save();

        res.status(200).json({ success: true, data: { isActive: chatbot.isActive } });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
}

async function setMasterChatbotController(req, res) {
    try {
        const { companyId } = req.user;
        const { id } = req.params;

        const chatbot = await chatBotModel.findOne({ _id: id, companyId });
        if (!chatbot) {
            return res.status(404).json({ success: false, message: "Chatbot not found or unauthorized" });
        }

        // Unset all other master chatbots for this company
        await chatBotModel.updateMany(
            { companyId, _id: { $ne: id } },
            { $set: { isMaster: false } }
        );

        // Set this one as master
        chatbot.isMaster = true;
        await chatbot.save();

        res.status(200).json({ success: true, message: "Master chatbot set successfully", data: chatbot });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
}

module.exports = {
    createChatbotController,
    getMyChatbotsController,
    updateChatbotController,
    deleteChatbotController,
    getWidgetConfigController,
    toggleChatBotStatusController,
    setMasterChatbotController
}