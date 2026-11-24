const express = require('express');
const router = express.Router();
const mediaController = require('../controllers/media.controller');

// Media stream and download have internal auth checks supporting both JWT and share tokens
router.get('/:id/stream', mediaController.streamMedia);
router.get('/:id/download', mediaController.downloadMedia);
router.get('/:id/thumbnail', mediaController.getThumbnail);

module.exports = router;
