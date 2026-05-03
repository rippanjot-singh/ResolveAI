const { z } = require('zod');

const updateChatbotSchema = z.object({
    name: z.string().min(1, "Name is required").optional(),
    description: z.string().optional(),
    prompt: z.string().optional(),
    style: z.object({
        brandColor: z.object({
            primary: z.string().optional(),
            secondary: z.string().optional(),
            accent: z.string().optional(),
        }).optional(),
        textColor: z.string().optional(),
        bgColor: z.string().optional(),
        corner: z.enum(['rounded', 'square']).optional(),
        icon: z.enum(['rounded', 'square']).optional(),
        replyStyle: z.object({
            textColor: z.string().optional(),
            bgColor: z.string().optional(),
            replyType: z.enum(['bubble', 'text']).optional(),
        }).optional(),
        senderStyle: z.object({
            textColor: z.string().optional(),
            bgColor: z.string().optional(),
            senderType: z.enum(['bubble', 'text']).optional(),
        }).optional(),
    }).optional(),
    greeting: z.string().optional(),
    faq: z.array(z.any()).optional(),
    position: z.enum(['bottom-right', 'bottom-left']).optional(),
    isActive: z.boolean().optional(),
    isMaster: z.boolean().optional(),
    verifiedDomains: z.array(z.string()).optional(),
    restrictedDomains: z.array(z.string()).optional(),
    integrations: z.array(z.object({
        provider: z.string().optional(),
        fileId: z.string().optional(),
        name: z.string().optional(),
        description: z.string().optional(),
    })).optional(),
});

module.exports = {
    updateChatbotSchema
};
