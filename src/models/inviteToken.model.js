const mongoose = require('mongoose');

const inviteTokenSchema = new mongoose.Schema({
    companyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'company',
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
    speciality: {
        type: String,
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