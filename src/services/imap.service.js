const { ImapFlow } = require('imapflow');
const { decrypt } = require('../utils/crypto.utils');

function buildClient(emailSettings) {
    return new ImapFlow({
        host: decrypt(emailSettings.IMapHost),
        port: parseInt(emailSettings.ImapPort) || 993,
        secure: true,
        family: 4,
        auth: {
            user: decrypt(emailSettings.User),
            pass: decrypt(emailSettings.Pass)
        },
        connectionTimeout: 10000,
        tls: {
            rejectUnauthorized: false
        },
        logger: false
    });
}

// Fetch only UNSEEN emails — called every poll cycle
async function fetchUnseenEmails(emailSettings) {
    if (!emailSettings?.IMapHost || !emailSettings?.User || !emailSettings?.Pass) {
        console.warn('[IMAP] Missing settings, skipping fetch.');
        return [];
    }

    const client = buildClient(emailSettings);
    try {
        await client.connect();
        await client.mailboxOpen('INBOX');

        // Search only for unseen messages
        const uids = await client.search({ seen: false });
        if (!uids || uids.length === 0) {
            await client.logout();
            return [];
        }

        console.log(`[IMAP] Found ${uids.length} UNSEEN email(s). Fetching...`);
        const emails = [];
        const fetchedUids = [];

        for await (let message of client.fetch(uids, { envelope: true, source: true }, { uid: true })) {
            emails.push({
                uid: message.uid,
                seq: message.seq,
                subject: message.envelope.subject || '(No Subject)',
                from: (message.envelope.from?.length > 0) ? message.envelope.from[0].address : 'Unknown',
                to: (message.envelope.to?.length > 0) ? message.envelope.to[0].address : 'Unknown',
                date: message.envelope.date,
                body: message.source ? message.source.toString() : ''
            });
            fetchedUids.push(message.uid);
        }

        // Mark all fetched emails as seen in one batch after the loop
        if (fetchedUids.length > 0) {
            await client.messageFlagsAdd(fetchedUids, ['\\Seen'], { uid: true });
        }

        emails.sort((a, b) => new Date(a.date) - new Date(b.date)); // oldest first
        await client.logout();
        return emails;
    } catch (error) {
        console.error('[IMAP] Error during fetch:', error.message);
        try { await client.logout(); } catch (_) {}
        return [];
    }
}

// Fetch all UIDs in inbox — used ONCE at bootstrap to mark existing emails as processed
async function fetchAllUids(emailSettings) {
    if (!emailSettings?.IMapHost || !emailSettings?.User || !emailSettings?.Pass) return [];

    const client = buildClient(emailSettings);
    try {
        await client.connect();
        let mailbox = await client.mailboxOpen('INBOX');
        if (mailbox.exists === 0) { await client.logout(); return []; }

        const uids = await client.search({ all: true });
        await client.logout();
        return uids || [];
    } catch (error) {
        console.error('[IMAP] Error fetching all UIDs:', error.message);
        try { await client.logout(); } catch (_) {}
        return [];
    }
}

// Legacy: kept for the manual GET /api/user/emails endpoint
async function fetchEmails(emailSettings) {
    return fetchUnseenEmails(emailSettings);
}

module.exports = { fetchEmails, fetchUnseenEmails, fetchAllUids };
