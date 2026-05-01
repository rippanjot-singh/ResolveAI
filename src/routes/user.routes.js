const express = require('express');
const { updateUser, getUserEmails } = require('../controllers/user.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const router = express.Router()

router.patch("/:id", authMiddleware, updateUser)
router.get("/emails", authMiddleware, getUserEmails)

module.exports = router