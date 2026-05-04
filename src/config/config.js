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

if (!process.env.SMTP_HOST) {
    throw new Error("SMTP_HOST is not defined in environment variables")
}

if (!process.env.SMTP_PORT) {
    throw new Error("SMTP_PORT is not defined in environment variables")
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

if (!process.env.NOTION_CLIENT_ID) {
    throw new Error("NOTION_CLIENT_ID is not defined in environment variables")
}

if (!process.env.NOTION_CLIENT_SECRET) {
    throw new Error("NOTION_CLIENT_SECRET is not defined in environment variables")
}

if (!process.env.REDIS_HOST) {
    throw new Error("REDIS_HOST is not defined in environment variables")
}

if (!process.env.REDIS_PORT) {
    throw new Error("REDIS_PORT is not defined in environment variables")
}

if (!process.env.REDIS_PASSWORD) {
    throw new Error("REDIS_PASSWORD is not defined in environment variables")
}



const config = {
    PORT: process.env.PORT || 8080,
    MONGO_URI: process.env.MONGO_URI,
    JWT_SECRET: process.env.JWT_SECRET,
    FRONTEND_URL: process.env.FRONTEND_URL,
    BACKEND_URL: process.env.BACKEND_URL,
    MISTRAL_API_KEY: process.env.MISTRAL_API_KEY,
    GOOGLE_API_KEY: process.env.GOOGLE_API_KEY,
    SMTP_HOST: process.env.SMTP_HOST,
    SMTP_PORT: process.env.SMTP_PORT,
    EMAIL_USER: process.env.EMAIL_USER,
    EMAIL_PASS: process.env.EMAIL_PASS,
    SUPPORT_EMAIL: process.env.SUPPORT_EMAIL,
    ENCRYPTION_KEY: process.env.ENCRYPTION_KEY,
    PINECONE_API_KEY: process.env.PINECONE_API_KEY,
    NOTION_CLIENT_ID: process.env.NOTION_CLIENT_ID,
    NOTION_CLIENT_SECRET: process.env.NOTION_CLIENT_SECRET,
    REDIS_HOST: process.env.REDIS_HOST,
    REDIS_PORT: process.env.REDIS_PORT,
    REDIS_PASSWORD: process.env.REDIS_PASSWORD,
    NODE_ENV: process.env.NODE_ENV,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    GOOGLE_REDIRECT_URI: process.env.GOOGLE_REDIRECT_URI
}

module.exports = config