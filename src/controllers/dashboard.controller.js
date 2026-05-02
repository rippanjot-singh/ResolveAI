const ticketModel = require("../models/ticket.model");
const chatBotModel = require("../models/chatbot.model");
const leadModel = require("../models/lead.model");
const interactionModel = require("../models/interaction.model");
const mongoose = require("mongoose");

async function getDashboardSummary(req, res) {
    try {
        const { companyId } = req.user;

        // Fetch KPI counts
        const [
            openTicketsCount,
            closedTicketsCount,
            highPriorityCount,
            activeChatbotsCount,
            totalLeadsCount,
            recentTickets,
            activeChatbots,
            recentInteractions
        ] = await Promise.all([
            ticketModel.countDocuments({ companyId, status: "open" }),
            ticketModel.countDocuments({ companyId, status: "closed" }),
            ticketModel.countDocuments({ companyId, status: "open", priority: "high" }),
            chatBotModel.countDocuments({ companyId, isActive: true }),
            leadModel.countDocuments({ companyId }),
            ticketModel.aggregate([
                { $match: { companyId: new mongoose.Types.ObjectId(companyId), status: "open" } },
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
                        }
                    }
                },
                { $sort: { status: 1, priorityWeight: -1, createdAt: 1 } },
                { $limit: 10 }
            ]),
            chatBotModel.find({ companyId, isActive: true }).select("name verifiedDomains").limit(3),
            interactionModel.find({ chatbotId: { $in: await chatBotModel.find({ companyId }).distinct('_id') } })
                .sort({ createdAt: 1 })
                .limit(4)
                .populate('chatbotId', 'name')
        ]);

        return res.status(200).json({
            message: "Dashboard summary fetched successfully",
            status: "success",
            data: {
                kpis: {
                    openTickets: openTicketsCount,
                    closedTickets: closedTicketsCount,
                    highPriority: highPriorityCount,
                    activeChatbots: activeChatbotsCount,
                    totalLeads: totalLeadsCount
                },
                recentTickets,
                activeChatbots,
                recentInteractions
            }
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
    getDashboardSummary
};
