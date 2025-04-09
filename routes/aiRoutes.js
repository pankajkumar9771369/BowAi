const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth');
const aiController = require('../controllers/ai.controller');

router.post('/edit', auth, aiController.surgicalEdit);

module.exports = router;