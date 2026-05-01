const dotenv = require("dotenv");
dotenv.config();

if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI is not defined in environment variables")
}

if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is not defined in environment variables")
}

if (!process.env.FRONTEND_URL) {
    throw new Error("FRONTEND_URL is not defined in environment variables")
}

if(!process.env.BACKEND_URL) {
    throw new Error("BACKEND_URL is not defined in environment variables")
}

if (!process.env.MISTRAL_API_KEY) {
    throw new Error("MISTRAL_API_KEY is not defined in environment variables")
}

if (!process.env.GOOGLE_API_KEY) {
    throw new Error("GOOGLE_API_KEY is not defined in environment variables")
}

if (!process.env.EMAIL_HOST) {
    throw new Error("EMAIL_HOST is not defined in environment variables")
}

if (!process.env.EMAIL_PORT) {
    throw new Error("EMAIL_PORT is not defined in environment variables")
}

if (!process.env.EMAIL_USER) {
    throw new Error("EMAIL_USER is not defined in environment variables")
}

if (!process.env.EMAIL_PASS) {
    throw new Error("EMAIL_PASS is not defined in environment variables")
}

if (!process.env.SUPPORT_EMAIL) {
    throw new Error("SUPPORT_EMAIL is not defined in environment variables")
}

if (!process.env.PINECONE_API_KEY) {
    throw new Error("PINECONE_API_KEY is not defined in environment variables")
}



const config = {
    PORT: process.env.PORT || 8080,
    MONGO_URI: process.env.MONGO_URI,
    JWT_SECRET: process.env.JWT_SECRET,
    FRONTEND_URL: process.env.FRONTEND_URL,
    BACKEND_URL: process.env.BACKEND_URL,
    MISTRAL_API_KEY: process.env.MISTRAL_API_KEY,
    GOOGLE_API_KEY: process.env.GOOGLE_API_KEY,
    EMAIL_HOST: process.env.EMAIL_HOST,
    EMAIL_PORT: process.env.EMAIL_PORT,
    EMAIL_USER: process.env.EMAIL_USER,
    EMAIL_PASS: process.env.EMAIL_PASS,
    SUPPORT_EMAIL: process.env.SUPPORT_EMAIL,
    ENCRYPTION_KEY: process.env.ENCRYPTION_KEY,
    PINECONE_API_KEY: process.env.PINECONE_API_KEY
}

module.exports = config