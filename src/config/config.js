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



const config = {
    PORT: process.env.PORT || 8080,
    MONGO_URI: process.env.MONGO_URI,
    JWT_SECRET: process.env.JWT_SECRET,
    FRONTEND_URL: process.env.FRONTEND_URL,
    BACKEND_URL: process.env.BACKEND_URL,
    MISTRAL_API_KEY: process.env.MISTRAL_API_KEY,
    GOOGLE_API_KEY: process.env.GOOGLE_API_KEY
}

module.exports = config