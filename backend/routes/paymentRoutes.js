const express = require('express');
const router = express.Router();
const { protect, optionalProtect } = require('../middleware/authMiddleware');
const paymentController = require('../controllers/paymentController');

// Standard endpoints
router.post('/create-order', optionalProtect, paymentController.createOrder);
router.post('/verify', optionalProtect, paymentController.verifyPayment);

// Webhook endpoints
router.post('/webhook', paymentController.webhook);

module.exports = router;
