const { mistralModel } = require('../services/ai.service');
const { SystemMessage, HumanMessage } = require('@langchain/core/messages');
const sendMail = require('../services/email.service');
const { createEscalatedTicket } = require('../services/ticket.service');
const chatBotModel = require('../models/chatbot.model');
const processedEmailModel = require('../models/processedEmail.model');
const leadModel = require('../models/lead.model');
const { simpleParser } = require('mailparser');

async function processIncomingEmail(user, email) {
    try {
        // Skip if already processed
        const alreadyDone = await processedEmailModel.findOne({ userId: user._id, uid: email.uid });
        if (alreadyDone) return;

        const companyName = user.companyId?.name || user.name;
        const chatbot = await chatBotModel.findOne({ companyId: user.companyId });
        const context = chatbot ? chatbot.prompt : user.speciality || 'A professional assistant.';

        try {
            await leadModel.create({
                companyId: user.companyId,
                name: email.from,
                email: email.from,
                note: `lead captured from incoming email UID ${email.uid}. Subject: ${email.subject}`
            });
        } catch (e) {
            console.error('[EmailAI] Failed to create lead for incoming email:', e.message);
        }

        // Parse the raw MIME source to extract clean text
        const parsed = await simpleParser(email.body);
        const cleanBody = parsed.text || parsed.html || email.body;

        const systemPrompt = `You are a strict AI assistant handling incoming emails for "${companyName}".
Your goal is to determine if you can FULLY answer this email based ONLY on the provided context.

CONTEXT/KNOWLEDGE:
${context}

INCOMING EMAIL:
From: ${email.from}
Subject: ${email.subject}
Body:
${cleanBody.substring(0, 2000)}

STRICT RULES:
0. ESCALATE IMMEDIATELY: If the sender says anything like "talk to a human", "speak to an agent", "real person", "want a human", or any variation requesting human contact, respond ONLY with "TICKET". This overrides ALL other rules.
1. ONLY generate a reply if you have 100% of the information required to fully and accurately answer this email.
2. If you find yourself needing to use ANY placeholder text like "[Website Link]", "[App Link]", "[Price]", "[Name]", "[Insert X]", or ANY text inside square brackets [], respond ONLY with "TICKET". This is NON-NEGOTIABLE.
3. If the email is complex, requires human judgment, is a complaint, or needs specific data you don't have, respond ONLY with "TICKET".
4. NO HALLUCINATION: Do not invent facts, links, prices, or dates.
5. If the email is a simple greeting or a "thank you", respond with a short friendly reply.
6. If you decide to reply, the reply must be complete and ready to send. No bracketed text.

Your response format:
EITHER:
[Reply Starting with 'Subject: Re: ...']
OR:
TICKET`;

        const response = await mistralModel.invoke([
            new SystemMessage(systemPrompt),
            new HumanMessage('Please process this email.')
        ]);

        const aiContent = response.content.trim();
        console.log(`[EmailAI] Decision for UID ${email.uid}: ${aiContent.substring(0, 60)}...`);

        // Code-level guardrail: detect any placeholder patterns the AI may have missed
        const hasPlaceholders = /\[[^\]]{1,60}\]/.test(aiContent);
        if (hasPlaceholders) {
            console.warn(`[EmailAI] Placeholder detected in AI response — forcing TICKET.`);
        }

        let processingStatus = 'skipped';
        let finalResponse = '';

        if (hasPlaceholders || aiContent.toUpperCase().includes('TICKET')) {
            console.log(`[EmailAI] AI requested ticket for email UID ${email.uid} from ${email.from}`);
            processingStatus = 'ticket';
            await createEscalatedTicket(user, {
                name: email.from, // We don't have a specific name, just use the email as name
                email: email.from,
                inquiree: `Email Subject: ${email.subject}\n\nBody:\n${cleanBody.substring(0, 3000)}`,
                type: 'email',
                companyName: companyName,
                subjectTitle: email.subject
            });
        } else {
            processingStatus = 'replied';
            const subjectMatch = aiContent.match(/Subject: (.*)/i);
            const subject = subjectMatch ? subjectMatch[1] : `Re: ${email.subject}`;
            const body = aiContent.replace(/Subject: .*/i, '').trim();
            finalResponse = body;

            await sendMail(email.from, subject, body, body.replace(/\n/g, '<br>'), user.emailSettings);
            console.log(`[EmailAI] Reply sent to ${email.from} for UID ${email.uid}`);
        }

        // Mark as processed regardless of outcome
        await processedEmailModel.create({ 
            userId: user._id, 
            uid: email.uid,
            from: email.from,
            subject: email.subject,
            status: processingStatus,
            aiResponse: finalResponse || aiContent
        });

    } catch (error) {
        console.error(`[EmailAI] Error processing email UID ${email.uid}:`, error.message);
        
        // Try to mark as error so we don't infinitely retry failing emails
        try {
            await processedEmailModel.create({ 
                userId: user._id, 
                uid: email.uid,
                from: email.from,
                subject: email.subject,
                status: 'error',
                aiResponse: error.message
            });
        } catch (dbErr) {
            console.error(`[EmailAI] Failed to save error state for UID ${email.uid}:`, dbErr.message);
        }
    }
}

module.exports = { processIncomingEmail };
