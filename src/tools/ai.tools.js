const { tool } = require("@langchain/core/tools");
const { z } = require("zod");
const ticketModel = require("../models/ticket.model");

const createTicketTool = tool(
    async ({ name, email, inquiree, priority, companyId }) => {
        try {
            if (name.toLowerCase() === 'guest' || email.includes('example.com')) {
                return {
                    status: "failed",
                    message: "Cannot create ticket for Guest/Placeholder email. Please use the 'showTicketForm' tool to get user details first."
                };
            }

            const ticket = await ticketModel.create({
                companyId,
                name,
                email,
                inquiree,
                priority,
            });
            return {
                message: "Ticket created successfully",
                status: "success",
                ticket
            };
        } catch (error) {
            return {
                message: "Failed to create ticket",
                status: "failed",
                error: error.message
            }
        }
    },
    {
        name: "createTicketTool",
        description: "Create a ticket in the database. CRITICAL: Use this ONLY if you have the user's REAL name and REAL email address. If you are missing either, or if you only have a 'Guest' name, you MUST use 'showTicketForm' instead. NEVER hallucinate or guess an email.",
        schema: z.object({
            name: z.string(),
            email: z.string().email(),
            inquiree: z.string(),
            priority: z.enum(["low", "medium", "high"]),
        }),
    }
)

const showTicketForm = tool(
    async ({ inquiree }) => {
        if (inquiree) {
            return `RENDER_TICKET_FORM_MARKER|${JSON.stringify({ inquiree })}`;
        }
        return "RENDER_TICKET_FORM_MARKER";
    },
    {
        name: "showTicketForm",
        description: "Show a ticket/inquiry form to the user in the chat bubble. Use this when you are missing the user's name or email. If you already know what the user wants, pass it as 'inquiree' to pre-fill the form. IMPORTANT: 'inquiree' is for the REQUEST DESCRIPTION (e.g. 'Wants Data Science details'), NOT for their name.",
        schema: z.object({
            inquiree: z.string().optional().describe("A summary of the user's request or problem.")
        }),
    }
)

module.exports = {
    createTicketTool,
    showTicketForm
};