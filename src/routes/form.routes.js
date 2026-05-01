const express = require('express');
const router = express.Router();
const formController = require('../controllers/form.controller');

// Public route for form submission
router.post('/submit/:formId', formController.submitPublicForm);

// Create a new form (In production, add authMiddleware here)
router.post('/create', formController.createForm);

// Private route for viewing results (would normally have auth middleware)
router.get('/results/:formId', formController.getFormResults);

module.exports = router;
