const express = require('express');
const cors = require('cors');
const passport = require('passport');
const session = require('express-session');
require('dotenv').config();

// Configurar Passport
require('./config/passport');

const authRoutes = require('./routes/auth');
const dashboardRoutes = require('./routes/dashboard');
const referralRoutes = require('./routes/referral');

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());

// Configuração de sessão para OAuth do Facebook/Instagram
app.use(session({
  secret: process.env.SESSION_SECRET || 'chicoai_session_secret_2024',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 10 * 60 * 1000, // 10 minutos
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  },
}));

app.use(passport.initialize());
app.use(passport.session());

// Rotas
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/referral', referralRoutes);

// Rota de saúde
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'ChicoIA Affiliate API rodando!' });
});

// Tratamento de erros global
app.use((err, req, res, next) => {
  console.error('Erro:', err.stack);
  res.status(500).json({ error: 'Erro interno do servidor' });
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor ChicoIA Affiliate rodando na porta ${PORT}`);
  console.log(`📡 API disponível em http://localhost:${PORT}/api`);
});

module.exports = app;
