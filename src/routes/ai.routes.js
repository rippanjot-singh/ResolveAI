const express = require('express');
const router = express.Router()
const { askAI, makePromptwithWebsiteData, makePromptwithPDFData } = require('../controllers/ai.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const multer = require("multer")
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    }
});

router.post('/ask/:id', askAI)
router.post('/prompt/website/:chatbotId', authMiddleware, makePromptwithWebsiteData)
router.post('/prompt/pdf/:chatbotId', authMiddleware, upload.single("file"), makePromptwithPDFData)

module.exports = router