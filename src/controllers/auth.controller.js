const config = require('../config/config.js');
const inviteTokenModel = require('../models/inviteToken.model.js');
const userModel = require('../models/user.model.js');
const { generateToken, setAuthCookie } = require('../utils/auth.utils.js');
const { registerSchema, loginSchema } = require('../validators/auth.validator.js');
const crypto = require('crypto');


//-------------- REGISTER USER --------------//
async function userRegisterController(req, res) {
    try {
        const { inviteToken } = req.query;
        let role = '';
        if (inviteToken) {
            const inviteTokenData = await inviteTokenModel.findOne({ token: inviteToken });
            role = inviteTokenData.role;
        } else {
            role = 'admin';
        }
        const validated = registerSchema.parse(req.body);
        const { name, email, password, companyName } = validated;

        const isUserExists = await userModel.findOne({ email });

        if (isUserExists) {
            return res.status(422).json({ message: "User already exists", status: 'failed' });
        }

        const user = await userModel.create({
            companyName,
            name,
            email,
            password,
            role: role
        });

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
        const user = await userModel.findById(req.user.userId).select("-password");
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
        const { role } = req.body;
        const user = await userModel.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "User not found", status: 'failed' })
        }
        const token = crypto.randomBytes(32).toString('hex');
        const inviteToken = await inviteTokenModel.create({
            companyName: user.companyName,
            token: token,
            role: role,
            expiresAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000)
        });
        const inviteTokenUrl = `${config.FRONTEND_URL}/signup?inviteToken=${token}`;
        return res.status(200).json({ message: "Token created successfully", status: 'success', inviteTokenUrl })
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

