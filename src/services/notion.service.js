const axios = require('axios');
const { Client } = require('@notionhq/client');
const config = require('../config/config');

const NOTION_CLIENT_ID = config.NOTION_CLIENT_ID;
const NOTION_CLIENT_SECRET = config.NOTION_CLIENT_SECRET;
const REDIRECT_URI = `${config.BACKEND_URL}/api/notion/callback`;

class NotionService {
    getAuthUrl() {
        return `https://api.notion.com/v1/oauth/authorize?client_id=${NOTION_CLIENT_ID}&response_type=code&owner=user&redirect_uri=${encodeURIComponent(REDIRECT_URI)}`;
    }

    async exchangeCodeForToken(code) {
        const encoded = Buffer.from(`${NOTION_CLIENT_ID}:${NOTION_CLIENT_SECRET}`).toString('base64');
        
        const response = await axios.post('https://api.notion.com/v1/oauth/token', {
            grant_type: 'authorization_code',
            code,
            redirect_uri: REDIRECT_URI
        }, {
            headers: {
                'Authorization': `Basic ${encoded}`,
                'Content-Type': 'application/json'
            }
        });

        return response.data;
    }

    async listPages(accessToken) {
        const notion = new Client({ auth: accessToken });
        
        const response = await notion.search({
            page_size: 100
        });

        return response.results.map(item => {
            let name = 'Untitled';
            if (item.object === 'page') {
                name = item.properties?.title?.title?.[0]?.plain_text || 
                       item.properties?.Name?.title?.[0]?.plain_text || 
                       'Untitled Page';
            } else if (item.object === 'database') {
                name = item.title?.[0]?.plain_text || 'Untitled Database';
            }

            let parentId = null;
            if (item.parent?.type === 'workspace') {
                parentId = 'root';
            } else if (item.parent?.type === 'page_id') {
                parentId = item.parent.page_id;
            } else if (item.parent?.type === 'database_id') {
                parentId = item.parent.database_id;
            }

            return {
                id: item.id,
                name,
                type: item.object,
                url: item.url,
                parentId
            };
        });
    }

    async getPageContent(accessToken, pageId) {
        const notion = new Client({ auth: accessToken });
        const blocks = await notion.blocks.children.list({ block_id: pageId });
        
        // Simple text extraction for now
        let content = "";
        for (const block of blocks.results) {
            if (block.type === 'paragraph') {
                content += block.paragraph.rich_text.map(t => t.plain_text).join('') + "\n";
            } else if (block.type === 'heading_1') {
                content += "# " + block.heading_1.rich_text.map(t => t.plain_text).join('') + "\n";
            }
            // Add more block types as needed
        }
        return content;
    }
}

module.exports = new NotionService();
