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
    },
    knowledge: [{
        provider: { type: String, default: 'notion' },
        fileId: { type: String }, // Notion Page ID
        name: { type: String },
        description: { type: String },
        isActive: { type: Boolean, default: true }
    }],
    notionTokens: {
        access_token: String,
        workspace_id: String,
        workspace_name: String,
        workspace_icon: String,
        bot_id: String,
        owner: Object
    }
}, { timestamps: true });

const companyModel = mongoose.model('company', companySchema);

module.exports = companyModel;