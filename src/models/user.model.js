const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
    companyName: {
        type: String,
        required: true,
    },
    name: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
    },
    password: {
        type: String,
        required: true,
        select: false,
    },
    isGoogleUser: {
        type: Boolean,
        default: false,
    },
    role: {
        type: String,
        enum: ['member', 'admin'],
        default: 'admin',
    },
    notionTokens: {
        access_token: String,
        workspace_id: String,
        workspace_name: String,
        workspace_icon: String,
        bot_id: String,
        owner: Object
    },
    isOnboarded: {
        type: Boolean,
        default: false,
    },
    isSolviingTickets: {
        type: Boolean,
        default: true,
    },
    speciality: {
        type: String,
    },
    emailSettings: {
        Host: String,
        Port: String,
        User: String,
        Pass: String,
        SupportEmail: String
    }
}, { timestamps: true });

userSchema.pre('save', async function () {
    if (this.isModified('password')) {
        const hash = await bcrypt.hash(this.password, 10);
        this.password = hash;
    }

    if (this.isModified('emailSettings')) {
        const { encrypt } = require('../utils/crypto.utils');
        if (this.emailSettings.Host) this.emailSettings.Host = encrypt(this.emailSettings.Host);
        if (this.emailSettings.User) this.emailSettings.User = encrypt(this.emailSettings.User);
        if (this.emailSettings.Pass) this.emailSettings.Pass = encrypt(this.emailSettings.Pass);
        if (this.emailSettings.SupportEmail) this.emailSettings.SupportEmail = encrypt(this.emailSettings.SupportEmail);
    }

    return;
})

userSchema.methods.comparePassword = async function (password) {
    return await bcrypt.compare(password, this.password);
}

const userModel = mongoose.model('user', userSchema);

module.exports = userModel;