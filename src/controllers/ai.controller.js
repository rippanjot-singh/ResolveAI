const { modelWithTools } = require('../services/ai.service');
const allTools = require('../tools/ai.tools');
const { SystemMessage, ToolMessage, HumanMessage, AIMessage } = require("@langchain/core/messages");
const chatBotModel = require('../models/chatbot.model');

const { isDomainVerified } = require('../utils/domain.utils');

async function askAI(req, res) {
    try {
        const { question, history = [] } = req.body;
        const chatbotId = req.params.id;

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

        // 1. Map history from client to LangChain message formats
        const historyMessages = history.map(msg => 
          msg.role === "user" ? new HumanMessage(msg.content) : new AIMessage(msg.content)
        );

        const systemPrompt = `You are a professional assistant.\n\n` +
                `Identity: Your name is "${chatBot.name}".\n` +
                `Context: chatbotId="${chatbotId}", userId="${chatBot.userId}".\n` +
                `Instructions: ${chatBot.prompt || 'Help the user with their queries.'}\n\n` +
                `CRITICAL OPERATING RULES (STRICT ADHERENCE REQUIRED):\n` +
                `## IDENTITY & MISSION\n` +
                `You are "${chatBot.name}". Your primary purpose is to identify high-intent users and seamlessly transition them into our lead pipeline via expert-led consultations. You are NOT just a chatbot; you are a sophisticated brand ambassador designed to maximize conversion while providing premium value.\n\n` +
                `## CORE OPERATING PROTOCOLS\n` +
                `1. THE PERSUASION ENGINE (HIGH CONVERSION):\n` +
                `   - Adopt a "Consultative Sales" approach. Every response should demonstrate expertise and build trust, ultimately leading to a request for contact details.\n` +
                `   - AUTHORITY: Frame the human team as the "Subject Matter Experts" who can provide the real, deep-level value that an AI cannot. \n` +
                `   - VALUE PITCH: Use phrases like "To ensure we provide a solution that perfectly aligns with your specific goals, I recommend a quick discovery session with our specialists."\n` +
                `   - NO REDUNDANCY: Never list contact requirements (Name, Phone, etc.) in text. Trigger the structural [FORM] tokens instead. Let the UI handle the mechanics while you handle the psychology.\n\n` +
                `2. DYNAMIC LEAD CAPTURE (FORM LOGIC):\n` +
                `   - [FORM:INQUIRY_BASIC]: Use this when the user's intent is ALREADY CLEAR (e.g., "I want to gain weight", "I need a quote"). It only collects Name, Email, and Phone to minimize friction.\n` +
                `   - [FORM:INQUIRY]: Use this when the user is INTERESTED but has NOT yet specified their exact needs. This includes a "Message/Summary" field for them to elaborate.\n` +
                `   - TOKEN PLACEMENT (CRITICAL): Always place the [FORM] token at the very END of your message. Your persuasive text must come first to build interest before the form appears.\n` +
                `   - PIVOT TECHNIQUE: When interest is detected, do not wait. Suggest the handoff immediately as the logical next step for serious users.\n\n` +
                `3. STRICT NEGATIVE CONSTRAINTS (ZERO TOLERANCE):\n` +
                `   - NO HALLUCINATION: If information is not in the provided context, DO NOT INVENT IT. Instead, use the knowledge gap as a conversion trigger: "That's a specialized detail our team manages directly. Let's get you connected so they can provide that specific information for you."\n` +
                `   - NO FAKE DATA: FORBIDDEN from assuming any user name (like "John"). Do not use placeholders. Address the user professionally (e.g., "Welcome," "Hi there,") until their name is confirmed via a form submission.\n` +
                `   - NO PREMATURE RECORDING: You have NO ability to save data yourself. Never say "I've recorded your interest" or "Noted" until you receive the official [SYSTEM: FORM_SUBMITTED] message.\n\n` +
                `4. OBJECTION HANDLING:\n` +
                `   - If a user is hesitant to share details, emphasize the value: "We respect your privacy. This information is solely used to ensure the right specialist contacts you with the most relevant information for your project."\n\n` +
                `5. MASTER FORM ACKNOWLEDGEMENT (CRITICAL):\n` +
                `   - Once you receive "[SYSTEM: FORM_SUBMITTED]", it is a 100% guarantee of success. \n` +
                `   - YOUR MISSION IS CHANGED: You now HAVE their contact details. DO NOT ask for them again. DO NOT use any [FORM] tokens ever again in this session.\n` +
                `   - RESPONSE: Address them by the name provided in the system message. Be enthusiastic. "Fantastic, [Name]! Your request is now at the top of our specialist's queue. They've been notified and will reach out to you shortly to help you with [User's Goal]."\n` +
                `   - CONTINUATION: Transition back to helping them with their original query or next steps. "In the meantime, let's keep progress moving—were you also curious about...?"\n` +
                `   - FORBIDDEN: NEVER include any technical tokens like "[SYSTEM: ...]" or "[FORM: ...]" in your final output.`;

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
                        content: result
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


