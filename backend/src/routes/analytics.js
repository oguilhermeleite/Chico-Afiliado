const express = require('express');
const analyticsController = require('../controllers/analyticsController');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Todas as rotas requerem autenticação
router.use(authMiddleware);

// Análise de conversões por plano
router.get('/conversions-by-plan', analyticsController.getConversionsByPlan);

// Breakdown de comissões por plano
router.get('/commission/breakdown', analyticsController.getCommissionBreakdown);

module.exports = router;
