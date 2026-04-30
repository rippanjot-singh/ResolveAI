const { ChatGoogleGenerativeAI } = require("@langchain/google-genai");
const { createTicketTool } = require("../tools/ai.tools");
const config = require("../config/config");
const { ChatMistralAI } = require("@langchain/mistralai");

// Monkey patch for @langchain/core/utils/uuid CommonJS compatibility
try {
    const uuid = require("@langchain/core/utils/uuid");
    if (uuid && uuid.v4 && typeof uuid.v4 === 'object' && typeof uuid.v4.default === 'function') {
        Object.defineProperty(uuid, 'v4', {
            value: uuid.v4.default,
            writable: true,
            configurable: true
        });
    }
} catch (e) {
    console.error("Failed to apply uuid monkey patch:", e);
}


const model = new ChatGoogleGenerativeAI({
    apiKey: config.GOOGLE_API_KEY,
    model: "gemini-2.5-flash",
    maxOutputTokens: 2048,
});

const model2 = new ChatMistralAI({
    apiKey: config.MISTRAL_API_KEY,
    model: "mistral-large-latest",
    maxOutputTokens: 2048,
});

const modelWithTools = model.bindTools([
    createTicketTool
]);


module.exports = { modelWithTools };

