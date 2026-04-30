const { tool } = require("@langchain/core/tools");
const { z } = require("zod");
const ticketModel = require("../models/ticket.model");

const createTicketTool = tool(
    async ({ name, email, inquiree, priority }) => {
        try {
            const ticket = await ticketModel.create({
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
        description: "Create a ticket. Priority should be assigned based on the urgency and importance of the ticket - AI will choose it.",
        schema: z.object({
            name: z.string(),
            email: z.string().email(),
            inquiree: z.string(),
            priority: z.enum(["low", "medium", "high"]),
        }),
    }
)

module.exports = {
    createTicketTool
};