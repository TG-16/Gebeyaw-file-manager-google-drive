const express = require('express');
const router = express.Router();
const trashController = require('../controllers/trash.controller');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);

router.get('/', trashController.listTrash);
router.post('/:id/restore', trashController.restoreItem);
router.delete('/:id', trashController.permanentlyDeleteItem);
router.delete('/', trashController.emptyTrash);

module.exports = router;
