const { ChatGoogleGenerativeAI } = require("@langchain/google-genai");
const {  } = require("../tools/ai.tools");
const config = require("../config/config");
const { ChatMistralAI } = require("@langchain/mistralai");

const model = new ChatGoogleGenerativeAI({
    apiKey: config.GOOGLE_API_KEY,
    model: "gemini-2.5-flash",
    maxOutputTokens: 2048,
});

const mistralModel = new ChatMistralAI({
    apiKey: config.MISTRAL_API_KEY,
    model: "mistral-large-latest",
    maxOutputTokens: 2048,
});

const modelWithTools = model.bindTools([
]);


module.exports = { modelWithTools };

