const { z } = require('zod');

const updateTicketSchema = z.object({
    priority: z.enum(['low', 'medium', 'high']).optional(),
    priorityLevel: z.number().optional(),
    assignedTo: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid User ID").optional(),
    status: z.enum(['open', 'closed', 'in-progress']).optional(),
});

module.exports = {
    updateTicketSchema
};
