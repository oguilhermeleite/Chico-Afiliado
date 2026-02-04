const express = require('express');
const passport = require('passport');
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/auth');
const instagramController = require('../controllers/instagramController');

const router = express.Router();

// Registro
router.post('/register', authController.register);

// Login
router.post('/login', authController.login);

// Google OAuth - Iniciar
router.get(
  '/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

// Google OAuth - Callback
router.get(
  '/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: '/login' }),
  authController.googleCallback
);

// Facebook/Instagram OAuth - Iniciar
// Salva o userId na sessão antes de redirecionar
router.get('/facebook', (req, res, next) => {
  // Armazena o userId do token JWT na sessão para usar no callback
  const token = req.query.token;
  if (token) {
    req.session.pendingUserId = token;
  }
  next();
}, passport.authenticate('facebook', {
  scope: [
    'instagram_basic',
    'pages_show_list',
    'pages_read_engagement',
    'instagram_manage_insights',
    'business_management'
  ]
}));

// Facebook/Instagram OAuth - Callback
router.get(
  '/facebook/callback',
  passport.authenticate('facebook', { session: false, failureRedirect: '/login?error=facebook_failed' }),
  authController.facebookCallback
);

// Verificar status da conexão Instagram
router.get('/instagram/status', authMiddleware, instagramController.getInstagramStatus);

// Desconectar Instagram
router.post('/instagram/disconnect', authMiddleware, instagramController.handleDisconnect);

// Dados do usuário atual
router.get('/me', authMiddleware, authController.getMe);

module.exports = router;
