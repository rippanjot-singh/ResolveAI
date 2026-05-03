const mongoose = require('mongoose');

const leadSchema = new mongoose.Schema({
    companyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'company',
        required: true
    },
    name: String,
    email: {
        type: String,
        required: true
    },
    note: String
}, { timestamps: true });

leadSchema.index({ companyId: 1, email: 1 }, { unique: true });

const leadModel = mongoose.model('lead', leadSchema);

module.exports = leadModel;