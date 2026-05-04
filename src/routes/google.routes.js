const express = require('express');
const { googleAuthUrl, googleCallbackController } = require('../controllers/auth.controller.js');
const router = express.Router();

router.get('/', googleAuthUrl);
router.get('/callback', googleCallbackController);

module.exports = router;
