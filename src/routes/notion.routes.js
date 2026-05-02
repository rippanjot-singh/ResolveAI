const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/auth.middleware');
const {
    getNotionAuthUrl,
    notionCallback,
    listNotionPages,
    addNotionIntegration,
    removeNotionIntegration,
    getNotionStatus
} = require('../controllers/notion.controller');

router.get('/auth-url', authMiddleware, getNotionAuthUrl);
router.get('/callback', authMiddleware, notionCallback);
router.get('/status', authMiddleware, getNotionStatus);
router.get('/pages', authMiddleware, listNotionPages);
router.post('/integrate', authMiddleware, addNotionIntegration);
router.post('/remove', authMiddleware, removeNotionIntegration);

module.exports = router;
