const companyModel = require('../models/company.model');
const notionService = require('../services/notion.service');

async function getNotionAuthUrl(req, res) {
    try {
        const state = req.user.companyId; // Pass companyId as state
        const authUrl = notionService.getAuthUrl(state);
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
        
        // Use state (companyId) if session cookie is missing during redirect
        const companyId = req.user?.companyId || req.query.state; 
        const userId = req.user?.userId;

        if (!companyId) {
            console.error('Notion Callback: No company ID found in request');
            return res.status(401).send('<h1>Auth failed</h1><p>Session expired. Please log in again.</p>');
        }

        console.log('Updating Notion tokens for company:', companyId);
        await companyModel.findByIdAndUpdate(companyId, {
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
        const company = await companyModel.findById(req.user.companyId);
        if (!company || !company.notionTokens?.access_token) {
            return res.status(400).json({ success: false, message: "Notion not connected", status: "not_connected" });
        }

        const pages = await notionService.listPages(company.notionTokens.access_token);
        return res.status(200).json({ success: true, pages });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
}

async function addNotionIntegration(req, res) {
    try {
        const { pageId, name, description } = req.body;
        const { companyId } = req.user;

        const company = await companyModel.findById(companyId);
        if (!company) {
            return res.status(404).json({ success: false, message: "Company not found" });
        }

        const exists = company.knowledge.find(i => i.fileId === pageId);
        if (exists) {
            return res.status(400).json({ success: false, message: "Page already integrated" });
        }

        company.knowledge.push({
            provider: 'notion',
            fileId: pageId,
            name,
            description: description || 'Notion Page'
        });

        await company.save();
        return res.status(200).json({ success: true, message: "Notion page integrated", knowledge: company.knowledge });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
}

async function removeNotionIntegration(req, res) {
    try {
        const { pageId } = req.body;
        const { companyId } = req.user;

        const company = await companyModel.findById(companyId);
        if (!company) {
            return res.status(404).json({ success: false, message: "Company not found" });
        }

        company.knowledge = company.knowledge.filter(i => i.fileId !== pageId);
        await company.save();

        return res.status(200).json({ success: true, message: "Integration removed", knowledge: company.knowledge });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
}

async function updateKnowledgeDescription(req, res) {
    try {
        const { pageId, description } = req.body;
        const { companyId } = req.user;

        const company = await companyModel.findById(companyId);
        if (!company) {
            return res.status(404).json({ success: false, message: "Company not found" });
        }

        const knowledgeItem = company.knowledge.find(i => i.fileId === pageId);
        if (!knowledgeItem) {
            return res.status(404).json({ success: false, message: "Knowledge item not found" });
        }

        knowledgeItem.description = description;
        await company.save();

        return res.status(200).json({ success: true, message: "Description updated", knowledge: company.knowledge });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
}

async function getNotionStatus(req, res) {
    try {
        const company = await companyModel.findById(req.user.companyId);
        const isConnected = !!(company?.notionTokens?.access_token);
        
        return res.status(200).json({ 
            success: true, 
            isConnected,
            workspace: isConnected ? company.notionTokens.workspace_name : null,
            knowledge: company?.knowledge || []
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
}

async function replaceKnowledgeSource(req, res) {
    try {
        const { oldPageId, newPageId, name, description } = req.body;
        const companyId = req.user?.companyId || req.companyId;

        const company = await companyModel.findById(companyId);
        if (!company) return res.status(404).json({ success: false, message: 'Company not found' });

        const itemIndex = company.knowledge.findIndex(k => k.fileId === oldPageId);
        if (itemIndex === -1) return res.status(404).json({ success: false, message: 'Original source not found' });

        if (oldPageId !== newPageId && company.knowledge.some(k => k.fileId === newPageId)) {
            return res.status(400).json({ success: false, message: 'New page is already integrated' });
        }

        company.knowledge[itemIndex] = {
            ...company.knowledge[itemIndex].toObject(),
            fileId: newPageId,
            name: name,
            description: description || company.knowledge[itemIndex].description
        };

        await company.save();

        res.status(200).json({
            success: true,
            message: 'Source replaced successfully',
            knowledge: company.knowledge
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
}

async function disconnectNotion(req, res) {
    try {
        const companyId = req.user?.companyId || req.companyId;
        const company = await companyModel.findById(companyId);
        
        if (!company) return res.status(404).json({ success: false, message: 'Company not found' });

        company.notionTokens = {
            access_token: null,
            workspace_id: null,
            workspace_name: null,
            workspace_icon: null,
            bot_id: null
        };

        await company.save();

        res.status(200).json({
            success: true,
            message: 'Notion disconnected successfully'
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
}

module.exports = {
    getNotionAuthUrl,
    notionCallback,
    listNotionPages,
    addNotionIntegration,
    removeNotionIntegration,
    updateKnowledgeDescription,
    getNotionStatus,
    replaceKnowledgeSource,
    disconnectNotion
};
