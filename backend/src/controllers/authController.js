const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const pool = require('../config/database');
const { saveInstagramData } = require('./instagramController');

function generateToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

function generateReferralCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = 'CHICO_';
  for (let i = 0; i < 9; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Nome, email e senha são obrigatórios' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'A senha deve ter no mínimo 6 caracteres' });
    }

    const existingUser = await pool.query(
      'SELECT id FROM influencers WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({ error: 'Email já cadastrado' });
    }

    const id = uuidv4();
    const passwordHash = await bcrypt.hash(password, 12);
    const referralCode = generateReferralCode();

    const result = await pool.query(
      `INSERT INTO influencers (id, name, email, password_hash, referral_code, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
       RETURNING id, name, email, referral_code, created_at`,
      [id, name, email, passwordHash, referralCode]
    );

    const user = result.rows[0];
    const token = generateToken(user);

    res.status(201).json({
      message: 'Conta criada com sucesso!',
      user,
      token,
    });
  } catch (error) {
    console.error('Erro no registro:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email e senha são obrigatórios' });
    }

    const result = await pool.query(
      'SELECT * FROM influencers WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    const user = result.rows[0];

    if (!user.password_hash) {
      return res.status(401).json({ error: 'Use o login com Google para esta conta' });
    }

    const isValidPassword = await bcrypt.compare(password, user.password_hash);

    if (!isValidPassword) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    const token = generateToken(user);

    res.json({
      message: 'Login realizado com sucesso!',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        referral_code: user.referral_code,
        created_at: user.created_at,
      },
      token,
    });
  } catch (error) {
    console.error('Erro no login:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

const googleCallback = async (req, res) => {
  try {
    const user = req.user;
    const token = generateToken(user);

    res.redirect(
      `${process.env.FRONTEND_URL}/auth/callback?token=${token}`
    );
  } catch (error) {
    console.error('Erro no callback Google:', error);
    res.redirect(`${process.env.FRONTEND_URL}/login?error=oauth_failed`);
  }
};

const facebookCallback = async (req, res) => {
  try {
    const { instagramData } = req.user;

    // Verificar se temos o token do usuário na sessão
    const userToken = req.session?.pendingUserId;

    if (!userToken) {
      console.error('Token do usuário não encontrado na sessão');
      return res.redirect(`${process.env.FRONTEND_URL}/dashboard?error=session_expired`);
    }

    // Decodificar o token para pegar o userId
    let userId;
    try {
      const decoded = jwt.verify(userToken, process.env.JWT_SECRET);
      userId = decoded.id;
    } catch (err) {
      console.error('Token inválido:', err);
      return res.redirect(`${process.env.FRONTEND_URL}/dashboard?error=invalid_token`);
    }

    // Verificar se conseguimos dados do Instagram
    if (!instagramData) {
      console.log('Instagram não conectado ou não é conta Business');
      return res.redirect(`${process.env.FRONTEND_URL}/dashboard?error=no_instagram_business`);
    }

    // Salvar dados do Instagram
    await saveInstagramData(userId, instagramData);

    // Limpar sessão
    delete req.session.pendingUserId;

    // Redirecionar com sucesso
    res.redirect(`${process.env.FRONTEND_URL}/dashboard?instagram=connected`);
  } catch (error) {
    console.error('Erro no callback Facebook:', error);
    res.redirect(`${process.env.FRONTEND_URL}/dashboard?error=instagram_failed`);
  }
};

const getMe = async (req, res) => {
  try {
    // Buscar dados completos incluindo Instagram
    const result = await pool.query(
      `SELECT id, name, email, referral_code, created_at,
              instagram_id, instagram_username, instagram_profile_picture, instagram_followers
       FROM influencers WHERE id = $1`,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    const user = result.rows[0];
    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        referral_code: user.referral_code,
        created_at: user.created_at,
        instagram: user.instagram_id ? {
          id: user.instagram_id,
          username: user.instagram_username,
          profile_picture: user.instagram_profile_picture,
          followers: user.instagram_followers,
        } : null,
      }
    });
  } catch (error) {
    console.error('Erro ao buscar usuário:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

module.exports = {
  register,
  login,
  googleCallback,
  facebookCallback,
  getMe,
};
