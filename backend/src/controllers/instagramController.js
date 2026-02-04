const pool = require('../config/database');

/**
 * Salva os dados do Instagram no banco de dados
 */
const saveInstagramData = async (userId, instagramData) => {
  try {
    const {
      instagramId,
      username,
      profilePicture,
      followers,
      facebookPageId,
      accessToken,
    } = instagramData;

    const result = await pool.query(
      `UPDATE influencers
       SET instagram_id = $1,
           instagram_username = $2,
           instagram_profile_picture = $3,
           instagram_followers = $4,
           facebook_page_id = $5,
           instagram_access_token = $6,
           instagram_connected_at = NOW(),
           updated_at = NOW()
       WHERE id = $7
       RETURNING id, instagram_id, instagram_username, instagram_profile_picture, instagram_followers`,
      [instagramId, username, profilePicture, followers, facebookPageId, accessToken, userId]
    );

    return result.rows[0];
  } catch (error) {
    console.error('Erro ao salvar dados do Instagram:', error);
    throw error;
  }
};

/**
 * Busca dados do influencer incluindo Instagram
 */
const getInfluencer = async (userId) => {
  try {
    const result = await pool.query(
      `SELECT id, name, email, referral_code,
              instagram_id, instagram_username,
              instagram_profile_picture, instagram_followers,
              instagram_connected_at
       FROM influencers
       WHERE id = $1`,
      [userId]
    );

    return result.rows[0] || null;
  } catch (error) {
    console.error('Erro ao buscar influenciador:', error);
    throw error;
  }
};

/**
 * Desconecta o Instagram do perfil
 */
const disconnectInstagram = async (userId) => {
  try {
    const result = await pool.query(
      `UPDATE influencers
       SET instagram_id = NULL,
           instagram_username = NULL,
           instagram_profile_picture = NULL,
           instagram_followers = 0,
           facebook_page_id = NULL,
           instagram_access_token = NULL,
           instagram_connected_at = NULL,
           updated_at = NOW()
       WHERE id = $1
       RETURNING id`,
      [userId]
    );

    return result.rows[0];
  } catch (error) {
    console.error('Erro ao desconectar Instagram:', error);
    throw error;
  }
};

/**
 * Verifica status da conexão Instagram
 */
const getInstagramStatus = async (req, res) => {
  try {
    const influencer = await getInfluencer(req.user.id);

    if (!influencer) {
      return res.status(404).json({ error: 'Influenciador não encontrado' });
    }

    res.json({
      connected: !!influencer.instagram_id,
      instagram: influencer.instagram_id ? {
        id: influencer.instagram_id,
        username: influencer.instagram_username,
        profile_picture: influencer.instagram_profile_picture,
        followers: influencer.instagram_followers,
        connected_at: influencer.instagram_connected_at,
      } : null,
    });
  } catch (error) {
    console.error('Erro ao verificar status do Instagram:', error);
    res.status(500).json({ error: 'Erro ao verificar status do Instagram' });
  }
};

/**
 * Handler para desconectar Instagram
 */
const handleDisconnect = async (req, res) => {
  try {
    await disconnectInstagram(req.user.id);
    res.json({
      success: true,
      message: 'Instagram desconectado com sucesso'
    });
  } catch (error) {
    console.error('Erro ao desconectar Instagram:', error);
    res.status(500).json({ error: 'Erro ao desconectar Instagram' });
  }
};

module.exports = {
  saveInstagramData,
  getInfluencer,
  disconnectInstagram,
  getInstagramStatus,
  handleDisconnect,
};
