const express = require('express');
const referralController = require('../controllers/referralController');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Buscar código de referência (requer auth)
router.get('/code', authMiddleware, referralController.getCode);

// Gerar novo código (requer auth)
router.post('/generate', authMiddleware, referralController.generateNewCode);

// Rastrear referência (público)
router.get('/track/:code', referralController.trackReferral);

module.exports = router;
