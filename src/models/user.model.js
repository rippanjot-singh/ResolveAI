const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
    },
    password: {
        type: String,
        required: true,
        select: false,
    },
    isGoogleUser: {
        type: Boolean,
        default: false,
    },
    role: {
        type: String,
        enum: ['member', 'admin'],
        default: 'member',
    },
    notionTokens: {
        access_token: String,
        workspace_id: String,
        workspace_name: String,
        workspace_icon: String,
        bot_id: String,
        owner: Object
    },
    isOnboarded: {
        type: Boolean,
        default: false,
    },
    isSolviingTickets: {
        type: Boolean,
        default: false,
    },
    speciality: {
        type: String,
        required: true,
    }
}, { timestamps: true });

userSchema.pre('save', async function () {
    if (!this.isModified('password')) {
        return;
    }
    const hash = await bcrypt.hash(this.password, 10);
    this.password = hash;

    return;
})

userSchema.methods.comparePassword = async function (password) {
    return await bcrypt.compare(password, this.password);
}

const userModel = mongoose.model('user', userSchema);

module.exports = userModel;