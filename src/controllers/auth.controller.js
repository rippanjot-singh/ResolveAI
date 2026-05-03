const config = require('../config/config.js');
const inviteTokenModel = require('../models/inviteToken.model.js');
const userModel = require('../models/user.model.js');
const companyModel = require('../models/company.model.js');
const { generateToken, setAuthCookie } = require('../utils/auth.utils.js');
const { registerSchema, loginSchema } = require('../validators/auth.validator.js');
const crypto = require('crypto');
const mongoose = require('mongoose');


//-------------- REGISTER USER --------------//
async function userRegisterController(req, res) {
    try {
        const { inviteToken } = req.query;
        const validated = registerSchema.parse(req.body);
        const { name, email, password, companyName } = validated;

        const isUserExists = await userModel.findOne({ email });
        if (isUserExists) {
            return res.status(422).json({ message: "User already exists", status: 'failed' });
        }

        if (!inviteToken && !companyName) {
            return res.status(400).json({ message: "Company name is required", status: 'failed' });
        }

        let role = '';
        let companyId = null;
        let speciality = '';

        if (inviteToken) {
            const inviteTokenData = await inviteTokenModel.findOne({ token: inviteToken, isActive: true });
            if (!inviteTokenData || inviteTokenData.expiresAt < new Date()) {
                return res.status(400).json({ message: "Invalid or expired invite token", status: 'failed' });
            }
            role = inviteTokenData.role;
            companyId = inviteTokenData.companyId;
            speciality = inviteTokenData.speciality || '';
        } else {
            role = 'admin';
        }

        // 1. Create the user
        const user = await userModel.create({
            name,
            email,
            password,
            role,
            speciality,
            companyId // Will be null for new admins temporarily
        });

        // 2. If it's a new admin, create the company and link it back
        if (!inviteToken) {
            const company = await companyModel.create({
                name: companyName,
                userId: user._id
            });
            user.companyId = company._id;
            await user.save();
        }

        const token = generateToken(user);
        setAuthCookie(res, token);

        if (inviteToken) {
            await inviteTokenModel.deleteOne({ token: inviteToken });
        }

        return res.status(201).json({ message: "User created successfully", status: 'success', user, isNewUser: true });
    } catch (error) {
        if (error.name === 'ZodError') {
            return res.status(400).json({ message: error.errors[0].message, status: 'failed' });
        }
        return res.status(500).json({ message: "Internal server error", status: 'failed', error: error.message });
    }
}

//-------------- LOGIN USER --------------//
async function userLoginController(req, res) {
    try {
        const validated = loginSchema.parse(req.body);
        const { email, password } = validated;

        const user = await userModel.findOne({ email }).select("+password");
        if (!user) {
            return res.status(404).json({ message: "User not found", status: 'failed' });
        }

        const isPasswordValid = await user.comparePassword(password);
        if (!isPasswordValid) {
            return res.status(401).json({ message: "Invalid password", status: 'failed' });
        }

        const token = generateToken(user);
        setAuthCookie(res, token);

        return res.status(200).json({ message: "User logged in successfully", status: 'success', user, token: token });
    } catch (error) {
        if (error.name === 'ZodError') {
            return res.status(400).json({ message: error.errors[0].message, status: 'failed' });
        }
        return res.status(500).json({ message: "Internal server error", status: 'failed', error: error.message });
    }
}

//-------------- LOGOUT USER --------------//
async function userLogoutController(req, res) {
    try {
        res.clearCookie("token");
        return res.status(200).json({ message: "User logged out successfully", status: 'success' });
    } catch (error) {
        return res.status(500).json({ message: "Internal server error", status: 'failed', error: error.message });
    }
}

async function me(req, res) {
    try {
        const user = await userModel.findById(req.user.userId).select("-password").populate('companyId');
        if (!user) {
            return res.status(404).json({ message: "User not found", status: 'failed' });
        }
        return res.status(200).json({ message: "User verified successfully", status: 'success', user });
    } catch (error) {
        return res.status(500).json({ message: "Internal server error", status: 'failed', error: error.message });
    }
}

async function createInviteTokenController(req, res) {
    try {
        const { userId } = req.user;
        const { role, speciality } = req.body;

        const user = await userModel.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "User not found", status: 'failed' })
        }

        // Only admins can invite
        if (user.role !== 'admin') {
            return res.status(403).json({ message: "Only admins can invite members", status: 'failed' });
        }

        const token = crypto.randomBytes(32).toString('hex');
        const inviteToken = await inviteTokenModel.create({
            companyId: user.companyId,
            token: token,
            role: role || 'member',
            speciality: role === 'member' ? speciality : undefined,
            expiresAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000) // 2 days
        });

        const inviteTokenUrl = `${config.FRONTEND_URL}/signup?inviteToken=${token}`;
        return res.status(200).json({ message: "Token created successfully", status: 'success', inviteTokenUrl, token })
    } catch (error) {
        return res.status(500).json({ message: "Internal server error", status: 'failed', error: error.message })
    }
}


module.exports = {
    userRegisterController,
    userLoginController,
    userLogoutController,
    me,
    createInviteTokenController
};

