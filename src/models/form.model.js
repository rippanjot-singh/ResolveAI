const mongoose = require('mongoose');

const formSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    fields: {
        type: [Object],
        required: true
    }
}, { timestamps: true });

const formModel = mongoose.model('form', formSchema);

module.exports = formModel;