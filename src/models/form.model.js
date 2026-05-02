const mongoose = require('mongoose');

const formSchema = new mongoose.Schema({
    companyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'company',
        required: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        required: true
    },
    name: {
        type: String,
        required: true
    },
    description: String,
    fields: [{
        label: String,
        name: String,
        type: {
            type: String,
            enum: ['text', 'email', 'number', 'textarea', 'select', 'checkbox'],
            default: 'text'
        },
        required: {
            type: Boolean,
            default: false
        },
        options: [String] // For select/checkbox
    }],
    isActive: {
        type: Boolean,
        default: true
    }
}, { timestamps: true });

module.exports = mongoose.model('Form', formSchema);
