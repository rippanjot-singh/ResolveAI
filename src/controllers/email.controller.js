const processedEmailModel = require('../models/processedEmail.model');
const mongoose = require('mongoose');
const { pollSpecificUser } = require('../services/emailPoller.service');

async function getProcessedEmailsController(req, res) {
    try {
        const { userId } = req.user;

        // Trigger on-demand sync in background (fire and forget for this request)
        pollSpecificUser(userId);

        const emails = await processedEmailModel.find({ userId: new mongoose.Types.ObjectId(userId) }).sort({ createdAt: -1 });

        return res.status(200).json({
            message: "Emails fetched successfully",
            status: "success",
            emails
        });
    } catch (error) {
        return res.status(500).json({
            message: "Internal server error",
            status: "failed",
            error: error.message
        });
    }
}

async function getEmailStatsController(req, res) {
    try {
        const { userId } = req.user;
        const stats = await processedEmailModel.aggregate([
            { $match: { userId: new mongoose.Types.ObjectId(userId) } },
            { $group: {
                _id: null,
                total: { $sum: 1 },
                resolved: { $sum: { $cond: [{ $eq: ["$status", "replied"] }, 1, 0] } },
                tickets: { $sum: { $cond: [{ $eq: ["$status", "ticket"] }, 1, 0] } },
                skipped: { $sum: { $cond: [{ $eq: ["$status", "skipped"] }, 1, 0] } },
                errors: { $sum: { $cond: [{ $eq: ["$status", "error"] }, 1, 0] } }
            }}
        ]);

        return res.status(200).json({
            message: "Email stats fetched successfully",
            status: "success",
            stats: stats[0] || { total: 0, resolved: 0, tickets: 0, skipped: 0, errors: 0 }
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
    getProcessedEmailsController,
    getEmailStatsController
};
