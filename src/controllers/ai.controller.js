const allTools = require('../tools/ai.tools');
const { SystemMessage, ToolMessage, HumanMessage, AIMessage } = require("@langchain/core/messages");
const chatBotModel = require('../models/chatbot.model');
const chatModel = require('../models/chat.model');
const { recordInteraction } = require('../utils/interaction.utils');

const { modelWithTools } = require('../services/ai.service');

const { isDomainVerified } = require('../utils/domain.utils');

async function askAI(req, res) {
    try {
        const { question, history = [], chatId } = req.body;
        const chatbotId = req.params.id;
        
        let chat = null;
        if (chatId) {
            chat = await chatModel.findById(chatId);
        }

        if (!chatbotId) {
            return res.status(400).json({ success: false, message: 'Chatbot ID is required' });
        }

        const chatBot = await chatBotModel.findById(chatbotId);
        if (!chatBot) {
            return res.status(404).json({ success: false, message: 'Chatbot not found' });
        }

        // Domain verification
        if (!isDomainVerified(req, chatBot)) {
            return res.status(403).json({ success: false, message: "Widget disabled for this domain." });
        }

        if (!chatBot.isActive) {
            return res.status(403).json({ success: false, message: "Chatbot is currently inactive." });
        }

        const historyMessages = history.map(msg => 
          msg.role === "user" ? new HumanMessage(msg.content) : new AIMessage(msg.content)
        );

        const systemPrompt = `You are a professional assistant.\n\n` +
                (chat ? `Talking to "${chat.name}" whose email is ${chat.email}\n\n` : '') +
                `Identity: Your name is "${chatBot.name}".\n` +
                `Context: chatbotId="${chatbotId}", userId="${chatBot.userId}".\n` +
                `Instructions: ${chatBot.prompt || 'Help the user with their queries.'}\n\n` +
                `CRITICAL OPERATING RULES (STRICT ADHERENCE REQUIRED):\n` +
                `## IDENTITY & MISSION\n` +
                `You are "${chatBot.name}". Your primary purpose is to help users and address their queries effectively. You should demonstrate expertise and build trust.\n\n` +
                `## CORE OPERATING PROTOCOLS\n` +
                `1. CONSULTATIVE APPROACH:\n` +
                `   - Provide deep-level value and expertise in your responses.\n` +
                `   - When appropriate, suggest creating a support ticket using the available tools to ensure the team can follow up with more specific information.\n\n` +
                `2. STRICT NEGATIVE CONSTRAINTS (ZERO TOLERANCE):\n` +
                `   - NO HALLUCINATION: If information is not in the provided context, DO NOT INVENT IT. Instead, suggest creating a ticket for a specialist to review: "That's a specialized detail our team manages directly. Let's get a ticket started so they can provide that specific information for you."\n` +
                `   - NO FAKE DATA: FORBIDDEN from assuming any user name. Address the user professionally until their name is confirmed.\n` +
                `   - NO PREMATURE RECORDING: You have NO ability to save data yourself except via the provided tools. Never say "I've recorded your interest" unless a tool call was successful.\n\n` +
                `3. TICKET CREATION ACKNOWLEDGEMENT:\n` +
                `   - Once a ticket is created via a tool, confirm it to the user. "Fantastic! I've created a ticket for you. Our team has been notified and will reach out to you shortly."\n` +
                `   - Transition back to helping them with any other queries.`;

        const messages = [
            new SystemMessage(systemPrompt),
            ...historyMessages,
            new HumanMessage(question)
        ];


        console.log("Invoking model...");
        const timeoutPromise = (ms) => new Promise((_, reject) => setTimeout(() => reject(new Error("AI Model Timeout")), ms));

        let response = await Promise.race([
            modelWithTools.invoke(messages),
            timeoutPromise(30000)
        ]);
        console.log("Model response received.");


        // Dynamic Tool Execution Loop
        if (response.tool_calls && response.tool_calls.length > 0) {
            console.log(`Tool calls detected: ${response.tool_calls.length}`);
            const toolResults = [];

            for (const toolCall of response.tool_calls) {
                const toolToExecute = allTools[toolCall.name];

                if (toolToExecute) {
                    console.log(`Executing tool: ${toolCall.name} with args:`, toolCall.args);
                    const result = await toolToExecute.invoke(toolCall.args);
                    console.log(`Tool ${toolCall.name} result:`, result);

                    toolResults.push(new ToolMessage({
                        tool_call_id: toolCall.id,
                        content: typeof result === 'string' ? result : JSON.stringify(result)
                    }));
                } else {
                    console.warn(`Tool not found: ${toolCall.name}`);
                }
            }

            if (toolResults.length > 0) {
                console.log("Re-invoking model with tool results...");
                const finalResponse = await Promise.race([
                    modelWithTools.invoke([
                        ...messages,
                        response,
                        ...toolResults
                    ]),
                    timeoutPromise(30000)
                ]);
                console.log("Final response received.");
                response = finalResponse;
            }
        }

        res.status(200).json({
            success: true,
            message: "Response from AI",
            data: response.content
        });

        // Background: Interaction recording (moved to service)
        if (chatId) {
            recordInteraction({
                chatbotId,
                chatId,
                userId: chatBot.userId,
                question,
                answer: response.content
            });
        }

    } catch (error) {
        console.error("AI Controller Error:", error);
        res.status(500).json({
            success: false,
            message: "Failed to get response from AI",
            error: error.message
        });
    }
}

module.exports = { askAI };
