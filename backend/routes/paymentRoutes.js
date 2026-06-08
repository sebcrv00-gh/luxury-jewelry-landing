const express = require('express');
const paymentController = require('../controllers/paymentController');
const { isAuthenticated } = require('../middleware/auth');

const router = express.Router();

router.post('/wompi/checkout/:orderId', isAuthenticated, paymentController.createWompiCheckout);
router.get('/wompi/orders/:orderId/status', paymentController.getWompiOrderStatus);
router.post('/wompi/webhook', paymentController.handleWompiWebhook);

module.exports = router;
