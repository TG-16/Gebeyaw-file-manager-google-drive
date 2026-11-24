const express = require('express');
const router = express.Router();
const objectController = require('../controllers/object.controller');
const { requireAuth } = require('../middleware/auth');
const { upload } = require('../middleware/upload');

router.use(requireAuth);

router.get('/:id', objectController.getObject);
router.post('/', upload.array('files', 15), objectController.createObject);
router.patch('/:id', objectController.updateObject);
router.patch('/:id/move', objectController.moveObject);
router.delete('/:id', objectController.deleteObject);
router.post('/:id/media', upload.array('files', 15), objectController.uploadMediaToObject);
router.delete('/:id/media/:mediaId', objectController.deleteMedia);

module.exports = router;
