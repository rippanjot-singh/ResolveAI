const mongoose = require('mongoose');

const companySchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        required: true
    },
    name: {
        type: String,
        required: true
    }
}, { timestamps: true });

const companyModel = mongoose.model('company', companySchema);

module.exports = companyModel;