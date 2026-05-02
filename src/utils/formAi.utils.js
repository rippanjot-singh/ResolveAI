const { mistralModel } = require('../services/ai.service');
const { SystemMessage, HumanMessage } = require("@langchain/core/messages");
const sendMail = require('../services/email.service');
const { createEscalatedTicket } = require('../services/ticket.service');
const userModel = require('../models/user.model');
const chatBotModel = require('../models/chatbot.model');
const formResultModel = require('../models/formResults.model');

async function processFormSubmission(form, submission) {
    try {
        console.log(`[FormAI] Processing submission for form: ${form.name} (${form._id})`);
        const user = await userModel.findById(form.userId).populate('companyId');
        if (!user) {
            console.warn(`[FormAI] User not found for ID: ${form.userId}`);
            return;
        }

        const companyName = user.companyId?.name || user.name;

        // Try to find a chatbot for this user to get context/knowledge
        const chatbot = await chatBotModel.findOne({ companyId: user.companyId });
        const context = chatbot ? chatbot.prompt : user.speciality || "A professional assistant.";

        const formTitle = form.name;
        const formData = JSON.stringify(submission.data, null, 2);

        // Improved email detection
        const userEmail = submission.data.email || submission.data.Email || submission.data.email_address || submission.data['Email Address'];

        console.log(`[FormAI] Detected email: ${userEmail || 'None'}`);

        const systemPrompt = `You are a strict AI assistant processing a form submission for "${companyName}".
Your goal is to determine if you can FULLY answer this inquiry based ONLY on the provided context.

CONTEXT/KNOWLEDGE:
${context}

FORM SUBMISSION ("${formTitle}"):
${formData}

STRICT RULES:
1. ONLY generate an email if you have 100% of the information required to answer the user's specific questions.
2. If you find yourself needing to use ANY placeholder text like "[Website Link]", "[App Link]", "[Price]", "[Name]", "[Insert X]", or ANY text inside square brackets [], respond ONLY with "TICKET". This is NON-NEGOTIABLE.
3. DO NOT ask follow-up questions for business inquiries. However, simple greetings or conversational "how are you" messages should be answered with a friendly, professional response.
4. If the inquiry is a request for a meeting, a custom quote, a technical troubleshooting, or anything complex, respond ONLY with "TICKET".
5. NO HALLUCINATION: Do not invent links, prices, or dates.
6. If you decide to send an email, it must be complete and ready to send. No bracketed text allowed.
7. FRIENDLY GREETINGS: If the user just says "Hi", "Hello", or "How are you", respond with a friendly email acknowledging them and inviting them to ask specific questions. Do NOT create a ticket for simple greetings.

Your response format:
EITHER:
[Email Content Starting with 'Subject: ...']
OR:
TICKET`;

        const response = await mistralModel.invoke([
            new SystemMessage(systemPrompt),
            new HumanMessage(`Please process this submission.`)
        ]);

        const aiContent = response.content.trim();
        console.log(`[FormAI] AI Decision: ${aiContent.substring(0, 50)}...`);

        // Code-level guardrail: detect any placeholder patterns the AI may have missed
        const hasPlaceholders = /\[[^\]]{1,60}\]/.test(aiContent);
        if (hasPlaceholders) {
            console.warn(`[FormAI] Placeholder detected in AI response — forcing TICKET.`);
        }

        if (hasPlaceholders || aiContent.toUpperCase().includes('TICKET')) {
            console.log(`[FormAI] AI requested ticket for form submission ${submission._id}`);
            await createEscalatedTicket(user, {
                name: submission.data.name || submission.data.Name,
                email: userEmail,
                inquiree: `Form Submission: ${formTitle}\n\nData:\n${formData}`,
                type: 'form',
                companyName: companyName,
                subjectTitle: formTitle
            });

            // Record: AI escalated, not resolved
            await formResultModel.findByIdAndUpdate(submission._id, {
                'aiResponse.resolved': false
            });
        } else if (userEmail) {
            console.log(`[FormAI] Sending AI generated email response to ${userEmail}`);
            const subjectMatch = aiContent.match(/Subject: (.*)/i);
            const subject = subjectMatch ? subjectMatch[1] : `Re: ${formTitle}`;
            const body = aiContent.replace(/Subject: .*/i, "").trim();

            await sendMail(userEmail, subject, body, body.replace(/\n/g, '<br>'), user.emailSettings);
            console.log(`[FormAI] Email sent successfully to ${userEmail}`);

            // Record: AI resolved this submission
            await formResultModel.findByIdAndUpdate(submission._id, {
                'aiResponse.resolved': true,
                'aiResponse.reply': body,
                'aiResponse.resolvedAt': new Date()
            });
        } else {
            console.warn(`[FormAI] AI generated content but no recipient email found in data.`);
        }

    } catch (error) {
        console.error("[FormAI] Error in processFormSubmission:", error);
    }
}

module.exports = { processFormSubmission };
