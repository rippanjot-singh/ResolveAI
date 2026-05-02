const mongoose = require('mongoose');

const processedEmailSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        required: true
    },
    uid: {
        type: Number,
        required: true
    },
    from: {
        type: String,
    },
    subject: {
        type: String,
    },
    status: {
        type: String,
        enum: ['replied', 'ticket', 'skipped', 'error'],
        default: 'skipped'
    },
    aiResponse: {
        type: String
    }
}, { timestamps: true });

// Compound index so lookups are fast
processedEmailSchema.index({ userId: 1, uid: 1 }, { unique: true });

module.exports = mongoose.model('processedEmail', processedEmailSchema);
