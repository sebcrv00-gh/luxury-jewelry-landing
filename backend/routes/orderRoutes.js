const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { isAuthenticated, isAdmin } = require('../middleware/auth');

router.post('/', isAuthenticated, orderController.create);
router.get('/', isAuthenticated, orderController.getMyOrders);
router.get('/mine/detailed', isAuthenticated, orderController.getMyOrdersDetailed);
router.get('/admin/all', isAuthenticated, isAdmin, orderController.getAll);
router.get('/:id', isAuthenticated, orderController.getById);

module.exports = router;
