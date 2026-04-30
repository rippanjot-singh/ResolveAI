const express = require('express');
const router = express.Router();
const { initChat } = require('../controllers/chat.controller');

router.post('/init', initChat);

module.exports = router;
