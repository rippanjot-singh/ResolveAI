const ticketModel = require("../models/ticket.model");
const chatBotModel = require("../models/chatbot.model");
const leadModel = require("../models/lead.model");
const interactionModel = require("../models/interaction.model");

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
            recentTickets
        ] = await Promise.all([
            ticketModel.countDocuments({ companyId, status: "open" }),
            ticketModel.countDocuments({ companyId, status: "closed" }),
            ticketModel.countDocuments({ companyId, status: "open", priority: "high" }),
            chatBotModel.countDocuments({ companyId, isActive: true }),
            leadModel.countDocuments({ companyId }),
            ticketModel.find({ companyId, status: "open" }).sort({ createdAt: -1 }).limit(5)
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
                recentTickets
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
