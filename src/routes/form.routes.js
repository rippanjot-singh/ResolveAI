const express = require('express');
const router = express.Router();
const formController = require('../controllers/form.controller');
const authMiddleware = require('../middlewares/auth.middleware');

// Public route for form submission
router.post('/submit/:formId', formController.submitPublicForm);

// Create a new form
router.post('/create', authMiddleware, formController.createForm);

// Private route for viewing results
router.get('/results/:formId', authMiddleware, formController.getFormResults);

module.exports = router;
