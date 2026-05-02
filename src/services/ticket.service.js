const ticketModel = require('../models/ticket.model');
const sendMail = require('./email.service');

async function createEscalatedTicket(user, {
    name,
    email,
    inquiree,
    type,
    companyName,
    subjectTitle
}) {
    console.log(`[TicketService] Creating escalated ${type} ticket for ${email}`);
    
    // Create the ticket
    await ticketModel.create({
        companyId: user.companyId,
        userId: user._id,
        name: name || "Unknown",
        email: email || "no-email@provided.com",
        inquiree: inquiree,
        status: 'open',
        priority: 'medium',
        type: type
    });

    // Send confirmation/acknowledgment email if email exists
    if (email && email !== "no-email@provided.com") {
        const subject = type === 'form' ? `Ticket Received: ${subjectTitle}` : `Re: ${subjectTitle}`;
        const body = `Hi ${name || 'there'},\n\nThank you for reaching out! We've received your inquiry. Because it requires a more detailed response, we have created a support ticket for our team.\n\nAn agent will review your request and get back to you shortly.\n\nBest regards,\n${companyName} Support Team`;
        
        await sendMail(email, subject, body, body.replace(/\n/g, '<br>'), user.emailSettings);
        console.log(`[TicketService] Acknowledgment email sent to ${email}`);
    }
}

module.exports = { createEscalatedTicket };
