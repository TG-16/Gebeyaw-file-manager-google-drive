const express = require('express');
const router = express.Router();
const searchController = require('../controllers/search.controller');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);

router.get('/', searchController.searchAll);

module.exports = router;
