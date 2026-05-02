const mongoose = require('mongoose');

const leadSchema = new mongoose.Schema({
    companyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'company',
        required: true
    },
    name: String,
    email: String,
    note: String
}, { timestamps: true });

const leadModel = mongoose.model('lead', leadSchema);

module.exports = leadModel;