const express = require('express');
const retentionController = require('../controllers/retentionController');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

router.use(authMiddleware);

// Visão geral de retenção (taxa, usuários ativos, churn, upgrades)
router.get('/overview', retentionController.getRetentionOverview);

// Lista de usuários com status de atividade
router.get('/user-activity', retentionController.getUserActivity);

// Registra atividade de um usuário referido
router.post('/track-activity', retentionController.trackActivity);

module.exports = router;
