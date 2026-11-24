const express = require('express');
const router = express.Router();
const folderController = require('../controllers/folder.controller');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);

router.get('/', folderController.getRootFolders);
router.get('/:id', folderController.getFolderContents);
router.get('/:id/breadcrumb', folderController.getBreadcrumb);
router.post('/', folderController.createFolder);
router.patch('/:id', folderController.updateFolder);
router.delete('/:id', folderController.deleteFolder);

module.exports = router;
