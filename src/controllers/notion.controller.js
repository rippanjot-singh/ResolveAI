const userModel = require('../models/user.model');
const chatBotModel = require('../models/chatbot.model');
const notionService = require('../services/notion.service');

async function getNotionAuthUrl(req, res) {
    try {
        const authUrl = notionService.getAuthUrl();
        return res.status(200).json({ success: true, authUrl });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
}

async function notionCallback(req, res) {
    try {
        const { code } = req.query;
        if (!code) {
            return res.status(400).send('<h1>Auth failed</h1><p>No code provided</p>');
        }

        const notionData = await notionService.exchangeCodeForToken(code);
        
        // Identification logic (assuming auth middleware or cookie)
        const userId = req.user?.userId || req.userId; 

        if (!userId) {
            console.error('Notion Callback: No user ID found in request');
            return res.status(401).send('<h1>Auth failed</h1><p>Session expired. Please log in again.</p>');
        }

        console.log('Updating Notion tokens for user:', userId);
        await userModel.findByIdAndUpdate(userId, {
            notionTokens: {
                access_token: notionData.access_token,
                workspace_id: notionData.workspace_id,
                workspace_name: notionData.workspace_name,
                workspace_icon: notionData.workspace_icon,
                bot_id: notionData.bot_id,
                owner: notionData.owner
            }
        });

        return res.send(`
            <script>
                window.opener.postMessage({ type: 'NOTION_AUTH_SUCCESS' }, '*');
                window.close();
            </script>
        `);
    } catch (error) {
        console.error('Notion OAuth Error:', error.message);
        return res.status(500).send(`<h1>Auth failed</h1><p>${error.message}</p>`);
    }
}

async function listNotionPages(req, res) {
    try {
        const user = await userModel.findById(req.user.userId);
        if (!user || !user.notionTokens?.access_token) {
            return res.status(400).json({ success: false, message: "Notion not connected", status: "not_connected" });
        }

        const pages = await notionService.listPages(user.notionTokens.access_token);
        return res.status(200).json({ success: true, pages });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
}

async function addNotionIntegration(req, res) {
    try {
        const { chatbotId, pageId, name, description } = req.body;
        const { companyId } = req.user;

        const chatbot = await chatBotModel.findOne({ _id: chatbotId, companyId });
        if (!chatbot) {
            return res.status(404).json({ success: false, message: "Chatbot not found" });
        }

        const exists = chatbot.integrations.find(i => i.fileId === pageId);
        if (exists) {
            return res.status(400).json({ success: false, message: "Page already integrated" });
        }

        chatbot.integrations.push({
            provider: 'notion',
            fileId: pageId,
            name,
            description: description || 'Notion Page'
        });

        await chatbot.save();
        return res.status(200).json({ success: true, message: "Notion page integrated", integrations: chatbot.integrations });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
}

async function removeNotionIntegration(req, res) {
    try {
        const { chatbotId, pageId } = req.body;
        const { companyId } = req.user;

        const chatbot = await chatBotModel.findOne({ _id: chatbotId, companyId });
        if (!chatbot) {
            return res.status(404).json({ success: false, message: "Chatbot not found" });
        }

        chatbot.integrations = chatbot.integrations.filter(i => i.fileId !== pageId);
        await chatbot.save();

        return res.status(200).json({ success: true, message: "Integration removed", integrations: chatbot.integrations });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
}

async function getNotionStatus(req, res) {
    try {
        const user = await userModel.findById(req.user.userId);
        const isConnected = !!(user?.notionTokens?.access_token);
        
        return res.status(200).json({ 
            success: true, 
            isConnected,
            workspace: isConnected ? user.notionTokens.workspace_name : null 
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
}

module.exports = {
    getNotionAuthUrl,
    notionCallback,
    listNotionPages,
    addNotionIntegration,
    removeNotionIntegration,
    getNotionStatus
};

