const express = require('express');
const router = express.Router();
const { 
    createTicketController, 
    getAllTicketsController, 
    getTicketController, 
    deleteTicketController, 
    updateTicketController 
} = require('../controllers/ticket.controller');
const authMiddleware = require('../middlewares/auth.middleware');

router.post('/create', authMiddleware, createTicketController);
router.get('/all', authMiddleware, getAllTicketsController);
router.get('/:ticketId', authMiddleware, getTicketController);
router.delete('/delete/:ticketId', authMiddleware, deleteTicketController);
router.patch('/update/:ticketId', authMiddleware, updateTicketController);

module.exports = router;
