const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
    companyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'company',
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
        SmtpHost: String,
        SmtpPort: String,
        User: String,
        Pass: String,
        IMapHost: String,
        ImapPort: String,
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
        if (this.emailSettings.SmtpHost) this.emailSettings.SmtpHost = encrypt(this.emailSettings.SmtpHost);
        if (this.emailSettings.User) this.emailSettings.User = encrypt(this.emailSettings.User);
        if (this.emailSettings.Pass) this.emailSettings.Pass = encrypt(this.emailSettings.Pass);
        if (this.emailSettings.SupportEmail) this.emailSettings.SupportEmail = encrypt(this.emailSettings.SupportEmail);
        if (this.emailSettings.IMapHost) this.emailSettings.IMapHost = encrypt(this.emailSettings.IMapHost);
    }

    return;
})

userSchema.methods.comparePassword = async function (password) {
    return await bcrypt.compare(password, this.password);
}

const userModel = mongoose.model('user', userSchema);

module.exports = userModel;