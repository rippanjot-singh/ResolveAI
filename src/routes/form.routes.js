const express = require('express');
const router = express.Router();
const formController = require('../controllers/form.controller');
const authMiddleware = require('../middlewares/auth.middleware');

// Public route for form submission
router.post('/submit/:formId', formController.submitPublicForm);

// Create a new form
router.post('/create', authMiddleware, formController.createForm);

// Private route for viewing results
router.get('/results/all', authMiddleware, formController.getAllFormResults);
router.get('/results/:formId', authMiddleware, formController.getFormResults);

// Get all forms
router.get('/', authMiddleware, formController.getAllForms);

// Toggle form status
router.put('/:formId/toggle', authMiddleware, formController.toggleFormStatus);

// Get single form
router.get('/:formId', authMiddleware, formController.getFormById);

// Update form
router.put('/:formId', authMiddleware, formController.updateForm);

// Delete form
router.delete('/:formId', authMiddleware, formController.deleteForm);

module.exports = router;
