const cron = require('node-cron');
const userModel = require('../models/user.model');
const processedEmailModel = require('../models/processedEmail.model');
const { fetchUnseenEmails, fetchAllUids } = require('./imap.service');
const { processIncomingEmail } = require('../utils/emailAi.utils');

// On first run for a user, mark ALL existing emails as processed without acting on them
async function bootstrapUser(user) {
    const existingCount = await processedEmailModel.countDocuments({ userId: user._id });
    if (existingCount > 0) return; // already bootstrapped

    const { decrypt } = require('../utils/crypto.utils');
    const supportEmail = user.emailSettings?.SupportEmail ? decrypt(user.emailSettings.SupportEmail) : (user.emailSettings?.User ? decrypt(user.emailSettings.User) : user.email);

    console.log(`[EmailPoller] Bootstrapping ${supportEmail} — marking existing emails as processed...`);
    const allUids = await fetchAllUids(user.emailSettings);

    if (allUids.length > 0) {
        const docs = allUids.map(uid => ({ userId: user._id, uid }));
        await processedEmailModel.insertMany(docs, { ordered: false }).catch(() => {}); // ignore duplicate key errors
        console.log(`[EmailPoller] Bootstrapped ${allUids.length} existing email(s) for ${supportEmail}. Future emails only.`);
    }
}

async function pollAllUsers() {
    console.log('[EmailPoller] Running inbox poll...');
    try {
        const users = await userModel.find({
            'emailSettings.IMapHost': { $exists: true, $ne: null }
        }).populate('companyId');

        console.log(`[EmailPoller] Found ${users.length} user(s) with IMAP configured.`);

        for (const user of users) {
            try {
                const { decrypt } = require('../utils/crypto.utils');
                const supportEmail = user.emailSettings?.SupportEmail ? decrypt(user.emailSettings.SupportEmail) : (user.emailSettings?.User ? decrypt(user.emailSettings.User) : user.email);

                // Step 1: Bootstrap if this is the first time we're seeing this user
                await bootstrapUser(user);

                // Step 2: Only fetch UNSEEN emails
                const emails = await fetchUnseenEmails(user.emailSettings);

                if (emails.length === 0) continue;

                console.log(`[EmailPoller] Processing ${emails.length} new email(s) for ${supportEmail}...`);
                for (const email of emails) {
                    await processIncomingEmail(user, email);
                }
            } catch (userErr) {
                console.error(`[EmailPoller] Error polling user ${user.email}:`, userErr.message);
            }
        }
    } catch (error) {
        console.error('[EmailPoller] Fatal poll error:', error.message);
    }
}

async function pollSpecificUser(userId) {
    try {
        const user = await userModel.findById(userId).populate('companyId');
        if (!user || !user.emailSettings || !user.emailSettings.IMapHost) {
            console.log(`[EmailPoller] Skipping manual poll for user ${userId} — no IMAP.`);
            return;
        }

        const { decrypt } = require('../utils/crypto.utils');
        const supportEmail = user.emailSettings?.SupportEmail ? decrypt(user.emailSettings.SupportEmail) : (user.emailSettings?.User ? decrypt(user.emailSettings.User) : user.email);

        console.log(`[EmailPoller] Manual poll triggered for ${supportEmail}...`);
        await bootstrapUser(user);
        const emails = await fetchUnseenEmails(user.emailSettings);

        if (emails.length > 0) {
            console.log(`[EmailPoller] Manual poll found ${emails.length} new email(s) for ${supportEmail}.`);
            for (const email of emails) {
                await processIncomingEmail(user, email);
            }
        } else {
            console.log(`[EmailPoller] Manual poll finished for ${supportEmail} — no new emails.`);
        }
    } catch (error) {
        console.error(`[EmailPoller] Manual poll error for user ${userId}:`, error.message);
    }
}

function startEmailPoller() {
    cron.schedule('*/10 * * * *', pollAllUsers);
    console.log('[EmailPoller] Inbox poller started (every 10 minutes).');
}

module.exports = { startEmailPoller, pollSpecificUser };
