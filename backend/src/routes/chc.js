const express = require('express');
const chcController = require('../controllers/chcController');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Todas as rotas requerem autenticação
router.use(authMiddleware);

// Total de CHC movimentado pelos usuários referidos
router.get('/total-moved', chcController.getTotalCHCMoved);

// Média de CHC movimentado por usuário (indicador de qualidade)
router.get('/average-per-user', chcController.getAverageCHCPerUser);

// Breakdown completo: total, média, por tipo, top usuários, tendência
router.get('/breakdown', chcController.getCHCMovementBreakdown);

module.exports = router;
