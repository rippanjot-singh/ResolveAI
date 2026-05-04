const allTools = require('../tools/ai.tools');
const { SystemMessage, ToolMessage, HumanMessage, AIMessage } = require("@langchain/core/messages");
const chatBotModel = require('../models/chatbot.model');
const chatModel = require('../models/chat.model');
const companyModel = require('../models/company.model');
const { tool } = require("@langchain/core/tools");
const { z } = require("zod");
const notionService = require('../services/notion.service');
const { recordInteraction } = require('../utils/interaction.utils');
const { modelWithTools, mistralModel } = require('../services/ai.service');
const { isDomainVerified } = require('../utils/domain.utils');
const { vectorDB } = require("../config/db");
const { getChatModel } = require("../services/ai.service");
const { scrape } = require("../utils/scrape.utils");
const multer = require("multer");
const { PDFParse } = require("pdf-parse");

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

        const company = await companyModel.findById(chatBot.companyId);
        if (!company) {
            return res.status(404).json({ success: false, message: 'Company not found' });
        }

        // Domain verification
        if (!isDomainVerified(req, chatBot)) {
            return res.status(403).json({ success: false, message: "Widget disabled for this domain." });
        }

        if (!chatBot.isActive) {
            return res.status(403).json({ success: false, message: "Chatbot is currently inactive." });
        }

        // Dynamic Tools from Company Knowledge
        const dynamicTools = {};
        const knowledgeTools = [];

        if (company.knowledge && company.knowledge.length > 0) {
            for (const item of company.knowledge) {
                if (item.isActive && item.provider === 'notion' && company.notionTokens?.access_token) {
                    const toolName = item.name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
                    const notionTool = tool(
                        async () => {
                            try {
                                console.log(`Fetching Notion content for tool: ${toolName}`);
                                const content = await notionService.getPageContent(company.notionTokens.access_token, item.fileId);
                                return content || "No content found in this page.";
                            } catch (err) {
                                console.error(`Error in dynamic tool ${toolName}:`, err);
                                return "Failed to fetch content from Notion.";
                            }
                        },
                        {
                            name: toolName,
                            description: item.description || `Search and retrieve information from the ${item.name} document.`,
                            schema: z.object({}) 
                        }
                    );
                    dynamicTools[toolName] = notionTool;
                    knowledgeTools.push(notionTool);
                }
            }
        }

        // Combine default tools with dynamic tools
        const currentModelWithTools = mistralModel.bindTools([
            ...Object.values(allTools),
            ...knowledgeTools
        ]);

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
                `   - NO INTERNAL LEAKS: NEVER reveal internal IDs (chatbotId, userId, companyId) or technical context to the user.\n` +
                `   - NO FAKE EMAILS: Never guess user emails. Use \`showTicketForm\` for Guests.\n` +
                `   - NO HALLUCINATION: Do not invent facts.\n` +
                `   - NO RAW TOOLS: NEVER write tool names or JSON like \`getRelevantMessagesTool{...}\` or \`showTicketForm{...}\` in your text. Tools are internal and must be called silently.` +
                `4. FORMS & TICKETS (ESCALATION):\n` +
                `   - BEFORE creating a ticket or asking the user to fill a form, you MUST use \`getRelevantMessagesTool\` to see if a human has previously answered a similar question.\n` +
                `   - If \`getRelevantMessagesTool\` returns a relevant resolution, use that information to answer the user directly. Only escalate if the retrieved information is not relevant or if the user explicitly asks for human help.\n` +
                `   - Call \`showTicketForm\` if missing user details or if a follow-up is absolutely needed after checking past resolutions.\n` +
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
            currentModelWithTools.invoke(messages),
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
                const toolToExecute = allTools[toolCall.name] || dynamicTools[toolCall.name];

                if (toolToExecute) {
                    console.log(`Executing tool: ${toolCall.name} with args:`, toolCall.args);
                    
                    const argsWithContext = { 
                        ...toolCall.args,
                        companyId: chatBot.companyId
                    };

                    const result = await toolToExecute.invoke(argsWithContext);
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
                    currentModelWithTools.invoke([
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
        let finalContent = typeof response.content === 'string' ? response.content : "";
        finalContent = finalContent.replace(/getRelevantMessagesTool\{.*?\}/g, "");
        finalContent = finalContent.replace(/showTicketForm\{.*?\}/g, "");
        finalContent = finalContent.replace(/createTicketTool\{.*?\}/g, "");
        finalContent = finalContent.replace(/\{\{?userId=.*?\}?\}|userId=".*?"/g, "");
        finalContent = finalContent.replace(/\{\{?chatbotId=.*?\}?\}|chatbotId=".*?"/g, "");
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

const prompt = `You are an expert AI prompt engineer.

Your task is to generate a high-quality SYSTEM PROMPT for a customer-facing AI chatbot using the provided business information.

The chatbot will be used on a website to answer customer questions, guide users, and convert visitors into customers.

Your system prompt must:

1. Clearly define chatbot role and purpose
2. Use provided business information as knowledge base
3. Define tone and personality
4. Define how chatbot should handle unknown questions
5. Define behavior rules
6. Define response style
7. Keep responses helpful, concise, and conversion-focused

Important Instructions:

- The chatbot represents the business
- The chatbot should never hallucinate information
- If information is missing, chatbot should say it does not know and suggest contacting support
- Chatbot should prioritize helpfulness and conversions
- Chatbot should answer only based on provided information
- Chatbot should be friendly, professional, and clear

Structure the system prompt in this format:

1. Role Definition
2. Business Overview
3. Products & Services
4. Target Audience
5. Tone & Personality
6. Behavior Rules
7. Conversion Guidelines
8. Support Handling
9. Unknown Question Handling
10. Response Style Rules
11. Short and concise responses

Return ONLY the final system prompt.
Do not explain anything.
Do not include commentary.
Only output the system prompt.

Now use the following business information to generate the system prompt, the following information is scrapped data of the website in very raw format: 
The prompt should be well structure and very very very detailed.
`;

async function makePromptwithWebsiteData(req, res) {
    try {
        const data = await scrape(req.body.url);
        if(data.length === 0){
            return res.status(400).json({
                success: false,
                message: "No data found",
                data: []
            });
        }
        console.log("Scraped data: " + data);
        console.log(JSON.stringify(data, null, 2));
        
        const chatBot = await chatBotModel.findById(req.params.chatbotId);
        if(!chatBot) return res.status(404).json({ success: false, message: "Chatbot not found" });

        const model = mistralModel
        const promptwithdata = prompt + "\n\n" + JSON.stringify(data, null, 2);

        const result = await model.invoke(promptwithdata);
        console.log(result.content);
        console.log('PROMPT RECEIVED');

        const updatedChatBot = await chatBotModel.findByIdAndUpdate(req.params.chatbotId, {
            prompt: result.content
        }, { new: true });

        console.log('UPDATING CHATBOT');
        console.log(updatedChatBot);
        console.log('UPDATED CHATBOT');

        const index = await vectorDB();
        await index.deleteMany({
            filter: {
                url: req.body.url
            }
        })
        // console.log(result.content);

        res.status(200).json({ 
            success: true, 
            message: "Prompt generated from website successfully",
            prompt: result.content, 
            updatedChatBot 
        });
    } catch (error) {
        console.error("Error in makePrompt:", error);
        res.status(500).json({ 
            success: false, 
            message: "Failed to get response from AI", 
            error: error.message 
        });
    }
}

async function makePromptwithPDFData(req, res) {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: "No file uploaded"
            });
        }
        const dataBuffer = req.file.buffer;

        const parser = new PDFParse(new Uint8Array(dataBuffer));
        const data = await parser.getText();

        console.log(data.text);
        
        const chatBot = await chatBotModel.findById(req.params.chatbotId);
        if(!chatBot) return res.status(404).json({ success: false, message: "Chatbot not found" });

        const model = mistralModel
        const promptwithdata = prompt + "\n\n" + JSON.stringify(data.text, null, 2);
        
        const result = await model.invoke(promptwithdata);

        const updatedChatBot = await chatBotModel.findByIdAndUpdate(req.params.chatbotId, {
            prompt: result.content
        }, { new: true });

        res.status(200).json({
            success: true,
            message: "PDF uploaded successfully",
            data: data.text,
            prompt: result.content,
            promptwithdata,
            updatedChatBot,
            fullResponse: result
        })
    } catch (error) {
        console.error("Error uploading PDF:", error);
        res.status(500).json({
            success: false,
            message: "Failed to process PDF",
            error: error.message
        });
    }
}

module.exports = { askAI, makePromptwithPDFData, makePromptwithWebsiteData };
