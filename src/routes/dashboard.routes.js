const express = require('express');
const router = express.Router();
const { getDashboardSummary } = require('../controllers/dashboard.controller');
const authMiddleware = require('../middlewares/auth.middleware');

router.get('/', authMiddleware, getDashboardSummary);

module.exports = router;
