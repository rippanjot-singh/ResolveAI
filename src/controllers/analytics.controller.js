const interactionModel = require('../models/interaction.model');
const chatBotModel = require('../models/chatbot.model');
const mongoose = require('mongoose');

async function getAnalytics(req, res) {
    try {
        const companyId = req.user?.companyId || req.companyId;
        const { timeframe = '7d' } = req.query;

        // 1. Get all chatbot IDs for this company
        const chatbots = await chatBotModel.find({ companyId }).select('_id');
        const chatbotIds = chatbots.map(cb => cb._id);

        if (chatbotIds.length === 0) {
            return res.status(200).json({
                success: true,
                data: {
                    dailyChats: [],
                    sentimentDistribution: [],
                    stats: {
                        totalChats: 0,
                        totalMessages: 0,
                        avgSentiment: 'N/A'
                    }
                }
            });
        }

        // 2. Define date range
        let startDate = new Date();
        if (timeframe === '24h') startDate.setHours(startDate.getHours() - 24);
        else if (timeframe === '7d') startDate.setDate(startDate.getDate() - 7);
        else if (timeframe === '30d') startDate.setDate(startDate.getDate() - 30);
        else startDate.setDate(startDate.getDate() - 7); // Default 7d

        // 3. Aggregate Daily Chats (Line Chart)
        const rawDailyChats = await interactionModel.aggregate([
            {
                $match: {
                    chatbotId: { $in: chatbotIds },
                    createdAt: { $gte: startDate }
                }
            },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                    count: { $sum: 1 }
                }
            },
            { $sort: { "_id": 1 } }
        ]);

        // Fill in gaps with 0
        const dailyChats = [];
        const dateMap = new Map(rawDailyChats.map(item => [item._id, item.count]));
        
        let curr = new Date(startDate);
        const end = new Date();
        
        while (curr <= end) {
            const dateStr = curr.toISOString().split('T')[0];
            dailyChats.push({
                date: dateStr,
                chats: dateMap.get(dateStr) || 0
            });
            curr.setDate(curr.getDate() + 1);
        }

        // 4. Aggregate Sentiment (Donut Chart)
        const sentimentDistribution = await interactionModel.aggregate([
            {
                $match: {
                    chatbotId: { $in: chatbotIds },
                    createdAt: { $gte: startDate }
                }
            },
            {
                $group: {
                    _id: "$sentiment",
                    value: { $sum: 1 }
                }
            },
            {
                $project: {
                    name: { $ifNull: ["$_id", "unknown"] },
                    value: 1,
                    _id: 0
                }
            }
        ]);

        // 5. Calculate Previous Period for Trends
        const prevStartDate = new Date(startDate);
        if (timeframe === '24h') prevStartDate.setHours(prevStartDate.getHours() - 24);
        else if (timeframe === '7d') prevStartDate.setDate(prevStartDate.getDate() - 7);
        else if (timeframe === '30d') prevStartDate.setDate(prevStartDate.getDate() - 30);

        const prevInteractions = await interactionModel.countDocuments({
            chatbotId: { $in: chatbotIds },
            createdAt: { $gte: prevStartDate, $lt: startDate }
        });

        const prevUniqueChats = await interactionModel.distinct('chatId', {
            chatbotId: { $in: chatbotIds },
            createdAt: { $gte: prevStartDate, $lt: startDate }
        });

        const totalInteractions = await interactionModel.countDocuments({
            chatbotId: { $in: chatbotIds },
            createdAt: { $gte: startDate }
        });

        const uniqueChats = await interactionModel.distinct('chatId', {
            chatbotId: { $in: chatbotIds },
            createdAt: { $gte: startDate }
        });

        // Calculate Trends
        const calculateTrend = (curr, prev) => {
            if (prev === 0) return curr > 0 ? 100 : 0;
            return Math.round(((curr - prev) / prev) * 100);
        };

        const chatTrend = calculateTrend(uniqueChats.length, prevUniqueChats.length);
        const messageTrend = calculateTrend(totalInteractions, prevInteractions);

        // Calculate Resolution Rate (mock logic for now: % of chats without negative sentiment)
        const negativeInteractions = await interactionModel.countDocuments({
            chatbotId: { $in: chatbotIds },
            createdAt: { $gte: startDate },
            sentiment: 'negative'
        });
        const resolutionRate = totalInteractions > 0 
            ? Math.round(((totalInteractions - negativeInteractions) / totalInteractions) * 100) 
            : 100;

        res.status(200).json({
            success: true,
            data: {
                dailyChats,
                sentimentDistribution,
                stats: {
                    totalMessages: totalInteractions,
                    totalChats: uniqueChats.length,
                    chatbotCount: chatbotIds.length,
                    messageTrend,
                    chatTrend,
                    resolutionRate
                }
            }
        });

    } catch (error) {
        console.error('Analytics Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
}

module.exports = {
    getAnalytics
};
