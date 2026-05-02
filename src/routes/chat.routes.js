const express = require('express');
const router = express.Router();
const { initChat, createPublicTicket, getAllChats, getChatInteractions } = require('../controllers/chat.controller');
const authMiddleware = require('../middlewares/auth.middleware');

router.post('/init', initChat);
router.post('/ticket', createPublicTicket);

// Authenticated studio routes
router.get('/all', authMiddleware, getAllChats);
router.get('/interactions/:chatId', authMiddleware, getChatInteractions);

module.exports = router;
