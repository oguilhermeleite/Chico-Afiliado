const express = require('express');
const serviceAuth = require('../middleware/serviceAuth');
const internalController = require('../controllers/internalController');

const router = express.Router();

// Todos os endpoints internos requerem autenticação via X-Service-Token
router.use(serviceAuth);

// Validar código de referência (GET — seguro para chamada frequente)
router.get('/validate/:code', internalController.validateCode);

// Registrar nova conversão (usuário se cadastrou via link de referência)
router.post('/conversion', internalController.createConversion);

// Confirmar pagamento — atualiza conversão para 'paid' e registra comissão
router.post('/payment-confirmed', internalController.confirmPayment);

// Registrar upgrade de plano
router.post('/upgrade', internalController.upgradeConversion);

// Registrar movimentação de CHC (Chico Coin)
router.post('/chc-movement', internalController.trackCHCMovement);

// Registrar atividade do usuário (login, ação relevante) — para retenção
router.post('/activity', internalController.trackActivity);

// Registrar churn (usuário cancelou assinatura)
router.post('/churn', internalController.trackChurn);

module.exports = router;
