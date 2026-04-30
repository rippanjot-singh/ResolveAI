const mongoose = require('mongoose');

const formResultsSchema = new mongoose.Schema({
    formId: {
        type: String,
        required: true
    },
    isResolved: {
        type: Boolean,
        default: false
    },
    givenTo: {
        type: String,
        enum: ['ai', 'human'],
        required: true
    },
    answerGiven: {
        type: String
    }
}, { timestamps: true });

const formResultsModel = mongoose.model('formResults', formResultsSchema);

module.exports = formResultsModel;