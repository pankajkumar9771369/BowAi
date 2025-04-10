const express = require('express');
const AIController = require('../controllers/ai.controller');
const router = express.Router();

// Define the route that takes fileId as a parameter in the URL
router.post('/files/:fileId/ai/edit', AIController.surgicalEdit);

module.exports = router;
