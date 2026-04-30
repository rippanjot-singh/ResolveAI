const { z } = require('zod');

const registerSchema = z.object({
    name: z.string().min(1, "Name is required"),
    email: z.string().email("Invalid email address"),
    password: z.string().min(1, "Password is required"),
    companyName: z.string().min(1, "Company name is required"),
});

const loginSchema = z.object({
    email: z.string().email("Invalid email address"),
    password: z.string().min(1, "Password is required"),
});

module.exports = {
    registerSchema,
    loginSchema
};
