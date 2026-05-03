const express = require('express');
const router = express.Router();
const { getAllLeads, deleteLead } = require('../controllers/lead.controller');
const authMiddleware = require('../middlewares/auth.middleware');

router.use(authMiddleware);
router.get('/', getAllLeads);
router.delete('/:leadId', deleteLead);

module.exports = router;
