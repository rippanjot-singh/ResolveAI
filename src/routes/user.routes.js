const express = require('express');
const { updateUser, getUserEmails, getCompanyUsers, deleteUser, updateCompany } = require('../controllers/user.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const router = express.Router()

router.get("/company", authMiddleware, getCompanyUsers)
router.patch("/company/update", authMiddleware, updateCompany)
router.patch("/:id", authMiddleware, updateUser)
router.delete("/:id", authMiddleware, deleteUser)
router.get("/emails", authMiddleware, getUserEmails)

module.exports = router