const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/auth.middleware');
const { getAnalytics } = require('../controllers/analytics.controller');

router.get('/', authMiddleware, getAnalytics);

module.exports = router;
