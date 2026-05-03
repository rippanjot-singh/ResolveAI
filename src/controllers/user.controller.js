const userModel = require('../models/user.model');
const { fetchEmails } = require('../services/imap.service');
const { decrypt } = require('../utils/crypto.utils.js');
const cacheService = require('../services/cache.service');

async function updateUser(req, res) {
    try {
        const { id } = req.params;
        const updates = req.body;
        const currentUser = req.user; // Assumes authMiddleware populates req.user

        const user = await userModel.findById(id);
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        // Role restriction: Only an admin can change any user's role
        if (updates.role && updates.role !== user.role) {
            if (currentUser.role !== 'admin') {
                return res.status(403).json({ success: false, message: "Forbidden: Only admins can change user roles" });
            }
        }

        // Apply updates from req.body to the user object
        // We use a whitelist or iterate keys
        const allowedUpdates = [
            'companyId', 'name', 'email', 'password', 
            'role', 'isOnboarded', 'isSolviingTickets', 
            'speciality', 'emailSettings'
        ];

        let invalidateImapCache = false;

        Object.keys(updates).forEach(key => {
            if (allowedUpdates.includes(key)) {
                user[key] = updates[key];
                if (key === 'emailSettings') invalidateImapCache = true;
            }
        });

        // Save triggers the pre-save hooks in user.model.js
        // (Handles password hashing and emailSettings encryption)
        await user.save();

        if (invalidateImapCache) {
            await cacheService.delete('cache:system:imap_users');
        }

        if (user.emailSettings) {
            if (user.emailSettings.SmtpHost) user.emailSettings.SmtpHost = decrypt(user.emailSettings.SmtpHost);
            if (user.emailSettings.User) user.emailSettings.User = decrypt(user.emailSettings.User);
            if (user.emailSettings.Pass) user.emailSettings.Pass = decrypt(user.emailSettings.Pass);
            if (user.emailSettings.SupportEmail) user.emailSettings.SupportEmail = decrypt(user.emailSettings.SupportEmail);
            if (user.emailSettings.IMapHost) user.emailSettings.IMapHost = decrypt(user.emailSettings.IMapHost);
        }

        res.status(200).json({
            success: true,
            message: "User updated successfully",
            data: user
        });

    } catch (error) {
        console.error("Update User Error:", error);
        return res.status(500).json({ 
            success: false, 
            message: "Internal server error", 
            error: error.message 
        });
    }
}

async function getCompanyUsers(req, res){
    try {
        const { companyId } = req.params;
        const users = await userModel.find({ companyId });
        res.status(200).json({
            success: true,
            message: "Users fetched successfully",
            data: users
        });
    } catch (error) {
        console.error("Get Company Users Error:", error);
        return res.status(500).json({ 
            success: false, 
            message: "Internal server error", 
            error: error.message 
        });
    }
}

async function getUserEmails(req, res) {
    try {
        const user = await userModel.findById(req.user.userId);
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        if (!user.emailSettings || !user.emailSettings.IMapHost) {
            return res.status(400).json({ success: false, message: "IMAP settings not configured" });
        }

        const emails = await fetchEmails(user.emailSettings);
        
        res.status(200).json({
            success: true,
            message: "Emails fetched successfully",
            data: emails
        });
    } catch (error) {
        console.error("Get User Emails Error:", error);
        return res.status(500).json({ 
            success: false, 
            message: "Internal server error", 
            error: error.message 
        });
    }
}

module.exports = { updateUser, getCompanyUsers, getUserEmails };