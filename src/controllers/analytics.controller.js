const interactionModel = require('../models/interaction.model');
const chatBotModel = require('../models/chatbot.model');
const mongoose = require('mongoose');

async function getAnalytics(req, res) {
    try {
        const companyId = req.user?.companyId || req.companyId;
        const { timeframe = '7d', chatbotId } = req.query;

        // 1. Determine target chatbots
        let chatbotIds = [];
        let chatbots = [];
        if (chatbotId) {
            chatbotIds = [new mongoose.Types.ObjectId(chatbotId)];
            chatbots = await chatBotModel.find({ _id: chatbotId, companyId }).select('_id name');
        } else {
            chatbots = await chatBotModel.find({ companyId }).select('_id name');
            chatbotIds = chatbots.map(cb => cb._id);
        }

        const botNames = new Map(chatbots.map(b => [b._id.toString(), b.name]));

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
        else startDate.setDate(startDate.getDate() - 7); 

        // 3. Aggregate Daily Chats (Multi-Line support)
        const rawDailyChats = await interactionModel.aggregate([
            {
                $match: {
                    chatbotId: { $in: chatbotIds },
                    createdAt: { $gte: startDate }
                }
            },
            {
                $group: {
                    _id: {
                        date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                        chatbotId: "$chatbotId"
                    },
                    count: { $sum: 1 }
                }
            },
            { $sort: { "_id.date": 1 } }
        ]);

        // Process for multi-line chart
        // Structure: [{ date: '2024-01-01', bot1: 10, bot2: 5, total: 15 }]
        const dailyChats = [];
        const dateBotMap = new Map(); // 'date' -> { botId: count }

        rawDailyChats.forEach(item => {
            const date = item._id.date;
            const bId = item._id.chatbotId.toString();
            if (!dateBotMap.has(date)) dateBotMap.set(date, {});
            dateBotMap.get(date)[bId] = item.count;
        });
        
        let curr = new Date(startDate);
        const end = new Date();
        
        while (curr <= end) {
            const dateStr = curr.toISOString().split('T')[0];
            const entry = { date: dateStr, total: 0 };
            
            const botCounts = dateBotMap.get(dateStr) || {};
            chatbotIds.forEach(id => {
                const bId = id.toString();
                const name = botNames.get(bId) || bId;
                const count = botCounts[bId] || 0;
                entry[name] = count;
                entry.total += count;
            });

            dailyChats.push(entry);
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
