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
                `1. CONCISE COMMUNICATION (STRICT):\n` +
                `   - Keep responses extremely short and direct.\n` +
                `   - NEVER ask more than one question at a time. Only ask what is absolutely necessary.\n\n` +
                `2. NO PRODUCT HALLUCINATION (STRICT):\n` +
                `   - FORBIDDEN from inventing product/course details (price, duration, curriculum, etc.) if not in context.\n` +
                `   - If missing info, say: "I don't have the specific details for that. Would you like me to create a ticket for the team to assist you?" and then use the form tool.\n\n` +
                `3. STRICT NEGATIVE CONSTRAINTS:\n` +
                `   - NO FAKE EMAILS: Never guess user emails. Use \`showTicketForm\` for Guests.\n` +
                `   - NO HALLUCINATION: Do not invent facts.\n` +
                `   - NO RAW TOOLS: NEVER write tool names or JSON like \`showTicketForm{...}\` in your text. Tools must be called silently.\n\n` +
                `4. FORMS & TICKETS:\n` +
                `   - Call \`showTicketForm\` if missing user details or if a follow-up is needed.\n` +
                `   - Your response MUST contain: RENDER_TICKET_FORM_MARKER when calling \`showTicketForm\`.\n\n` +
                `5. ACKNOWLEDGEMENT:\n` +
                `   - "I've created a ticket for you. Our team will reach out shortly."`;

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
        const toolCallHistory = [];
        if (response.tool_calls && response.tool_calls.length > 0) {
            console.log(`Tool calls detected: ${response.tool_calls.length}`);
            const toolResults = [];

            for (const toolCall of response.tool_calls) {
                toolCallHistory.push(toolCall);
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
                
                // Safety: If showTicketForm was called but marker is missing, append it
                const formCalled = toolCallHistory.some(tc => tc.name === 'showTicketForm');
                if (formCalled && !finalResponse.content.includes('RENDER_TICKET_FORM_MARKER')) {
                    finalResponse.content += '\n\nRENDER_TICKET_FORM_MARKER';
                }

                response = finalResponse;
            }
        }

        // Final Cleanup: Remove any leaked tool names or JSON blocks from the content
        let finalContent = response.content || "";
        finalContent = finalContent.replace(/showTicketForm\{.*?\}/g, "");
        finalContent = finalContent.replace(/createTicketTool\{.*?\}/g, "");
        finalContent = finalContent.trim();

        res.status(200).json({
            success: true,
            message: "Response from AI",
            data: finalContent
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
