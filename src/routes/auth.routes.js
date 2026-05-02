const express = require('express');
const { userRegisterController, userLoginController, userLogoutController, me, createInviteTokenController } = require('../controllers/auth.controller.js');
const authMiddleware = require('../middlewares/auth.middleware.js');
const router = express.Router()

router.post('/signup', userRegisterController)
router.post('/login', userLoginController)
router.post('/logout', userLogoutController)
router.post('/invite', authMiddleware, createInviteTokenController)
router.get('/me', authMiddleware, me)

module.exports = router