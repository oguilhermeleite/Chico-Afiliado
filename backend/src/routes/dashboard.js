const express = require('express');
const dashboardController = require('../controllers/dashboardController');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Todas as rotas requerem autenticação
router.use(authMiddleware);

// Métricas do dashboard
router.get('/metrics', dashboardController.getMetrics);

// Histórico de conversões
router.get('/conversions', dashboardController.getConversions);

module.exports = router;
