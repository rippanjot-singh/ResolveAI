const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/auth.middleware');
const { 
    getProcessedEmailsController, 
    getEmailStatsController 
} = require('../controllers/email.controller');

router.get('/all', authMiddleware, getProcessedEmailsController);
router.get('/stats', authMiddleware, getEmailStatsController);

module.exports = router;
