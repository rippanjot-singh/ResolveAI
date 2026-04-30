const mongoose = require('mongoose');

const inviteTokenSchema = new mongoose.Schema({
    companyName: {
        type: String,
        required: true,
    },
    token: {
        type: String,
        required: [true, 'Token is required']
    },
    role: {
        type: String,
        required: [true, 'Role is required'],
        enum: ['admin', 'member'],
    },
    expiresAt: {
        type: Date,
        required: [true, 'Expires at is required']
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, { timestamps: true });

const inviteTokenModel = mongoose.model('inviteToken', inviteTokenSchema);

module.exports = inviteTokenModel;