const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const { requireAuth } = require('../middleware/auth');
const { adminOnly } = require('../middleware/adminOnly');

router.use(requireAuth, adminOnly);

router.get('/users', adminController.listUsers);
router.post('/users', adminController.createUser);
router.patch('/users/:id', adminController.updateUser);
router.patch('/users/:id/password', adminController.resetPassword);
router.patch('/users/:id/status', adminController.toggleUserStatus);
router.delete('/users/:id', adminController.deleteUser);

module.exports = router;
