const pool = require('../config/database');

function generateReferralCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = 'CHICO_';
  for (let i = 0; i < 9; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

const getCode = async (req, res) => {
  try {
    const influencerId = req.user.id;

    const result = await pool.query(
      'SELECT referral_code FROM influencers WHERE id = $1',
      [influencerId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }

    const referralCode = result.rows[0].referral_code;
    const referralLink = `${process.env.BASE_URL || 'https://chicoai.com.br'}/ref/${referralCode}`;

    res.json({
      code: referralCode,
      link: referralLink,
    });
  } catch (error) {
    console.error('Erro ao buscar código:', error);
    res.status(500).json({ message: 'Erro ao buscar código de referência' });
  }
};

const generateNewCode = async (req, res) => {
  try {
    const influencerId = req.user.id;
    let newCode;
    let isUnique = false;

    while (!isUnique) {
      newCode = generateReferralCode();
      const existing = await pool.query(
        'SELECT id FROM influencers WHERE referral_code = $1',
        [newCode]
      );
      if (existing.rows.length === 0) {
        isUnique = true;
      }
    }

    await pool.query(
      'UPDATE influencers SET referral_code = $1, updated_at = NOW() WHERE id = $2',
      [newCode, influencerId]
    );

    const referralLink = `${process.env.BASE_URL || 'https://chicoai.com.br'}/ref/${newCode}`;

    res.json({
      message: 'Novo código gerado com sucesso!',
      code: newCode,
      link: referralLink,
    });
  } catch (error) {
    console.error('Erro ao gerar código:', error);
    res.status(500).json({ message: 'Erro ao gerar novo código' });
  }
};

const trackReferral = async (req, res) => {
  try {
    const { code } = req.params;

    const influencer = await pool.query(
      'SELECT id FROM influencers WHERE referral_code = $1',
      [code]
    );

    if (influencer.rows.length === 0) {
      return res.status(404).json({ message: 'Código de referência inválido' });
    }

    res.json({
      valid: true,
      influencer_id: influencer.rows[0].id,
    });
  } catch (error) {
    console.error('Erro ao rastrear referência:', error);
    res.status(500).json({ message: 'Erro ao processar referência' });
  }
};

module.exports = {
  getCode,
  generateNewCode,
  trackReferral,
};
