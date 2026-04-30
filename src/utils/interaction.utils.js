const interactionModel = require('../models/interaction.model');
const { HumanMessage } = require("@langchain/core/messages");
const { mistralSmall } = require('../services/ai.service');

async function analyzeSentiment(text) {
    try {
        const prompt = `Analyze the sentiment of this user question and respond with ONLY one word: "positive", "negative", or "neutral".\n\nQuestion: "${text}"`;
        const res = await mistralSmall.invoke([new HumanMessage(prompt)]);
        const content = res.content.trim().toLowerCase();
        if (content.includes('positive')) return 'positive';
        if (content.includes('negative')) return 'negative';
        return 'neutral';
    } catch (err) {
        console.error("Sentiment analysis failed:", err);
        return 'unknown';
    }
}

async function extractTopic(text) {
    try {
        const prompt = `Extract a very concise topic (max 3 words) from this user question. Respond with ONLY the topic.\n\nQuestion: "${text}"`;
        const res = await mistralSmall.invoke([new HumanMessage(prompt)]);
        return res.content.trim() || "General Query";
    } catch (err) {
        console.error("Topic extraction failed:", err);
        return "General Query";
    }
}

async function recordInteraction({ chatbotId, chatId, userId, question, answer }) {
    try {
        const [sentiment, topic] = await Promise.all([
            analyzeSentiment(question),
            extractTopic(question)
        ]);

        await interactionModel.create({
            chatbotId,
            chatId,
            userId,
            question,
            answer,
            sentiment,
            topic
        });
        console.log("Interaction recorded successfully.");
    } catch (err) {
        console.error("Failed to record interaction in service:", err);
    }
}

module.exports = { recordInteraction };
