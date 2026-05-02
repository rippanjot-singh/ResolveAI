const express = require('express');
const router = express.Router()
const { createChatbotController, updateChatbotController, getMyChatbotsController } = require('../controllers/chatbot.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const { getWidgetConfigController, toggleChatBotStatusController, deleteChatbotController } = require('../controllers/chatbot.controller');

router.post('/create', authMiddleware, createChatbotController);
router.get('/my-chatbots', authMiddleware, getMyChatbotsController);
router.patch('/update/:id', authMiddleware, updateChatbotController);
router.get('/config/:id', getWidgetConfigController);
router.patch('/toggle/status/:id', authMiddleware, toggleChatBotStatusController);
router.delete('/delete/:id', authMiddleware, deleteChatbotController);


module.exports = router;