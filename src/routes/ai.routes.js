const express = require('express');
const router = express.Router()
const { askAI } = require('../controllers/ai.controller');

router.post('/ask/:id', askAI)



module.exports = router