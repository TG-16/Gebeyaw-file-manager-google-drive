const express = require('express');
const router = express.Router();
const shareController = require('../controllers/share.controller');
const { requireAuth } = require('../middleware/auth');

// Protected sharing management routes
router.post('/folder/:id', requireAuth, shareController.createFolderShare);
router.delete('/folder/:id', requireAuth, shareController.revokeFolderShare);
router.patch('/folder/:id', requireAuth, shareController.toggleFolderDownload);

router.post('/object/:id', requireAuth, shareController.createObjectShare);
router.delete('/object/:id', requireAuth, shareController.revokeObjectShare);
router.patch('/object/:id', requireAuth, shareController.toggleObjectDownload);

// Public shared view route (no login required)
router.get('/:token', shareController.getSharedItem);

module.exports = router;
