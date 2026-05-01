const express = require('express');
const router = express.Router();
const { initChat, createPublicTicket } = require('../controllers/chat.controller');

router.post('/init', initChat);
router.post('/ticket', createPublicTicket);

module.exports = router;
