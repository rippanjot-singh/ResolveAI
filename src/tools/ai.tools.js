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

const getRelevantMessagesTool = tool(
    async ({ inquiry, companyId }) => {
        try {
            const { getReleventMessages } = require("../services/rag.service");
            const messages = await getReleventMessages(inquiry, companyId);
            
            if (!messages || !messages.matches || messages.matches.length === 0) {
                return {
                    status: "success",
                    message: "No relevant past resolutions found."
                };
            }

            return {
                status: "success",
                resolutions: messages.matches.map(m => m.metadata.text)
            };
        } catch (error) {
            console.error("getRelevantMessagesTool error:", error);
            return { status: "failed", error: error.message };
        }
    },
    {
        name: "getRelevantMessagesTool",
        description: "Search for past resolved tickets and human responses to help answer the user's question. Use this BEFORE creating a ticket to see if a human has already solved a similar issue. IMPORTANT: If you find a relevant answer, use it to reply directly to the user instead of creating a ticket.",
        schema: z.object({
            inquiry: z.string().describe("A summary of what the user is asking about."),
        })
    }
);

module.exports = {
    createTicketTool,
    showTicketForm,
    getRelevantMessagesTool
};