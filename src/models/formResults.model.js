const mongoose = require('mongoose');

const formResultSchema = new mongoose.Schema({
    formId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Form',
        required: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        required: true
    },
    data: {
        type: mongoose.Schema.Types.Mixed,
        required: true
    },
    metadata: {
        ip: String,
        userAgent: String,
        referrer: String
    }
}, { timestamps: true });

module.exports = mongoose.model('FormResult', formResultSchema);
