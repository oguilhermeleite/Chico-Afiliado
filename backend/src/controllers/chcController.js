const pool = require('../config/database');

// Cache simples em memória (atualiza a cada 10 minutos)
const cache = new Map();
const CACHE_TTL_MS = 10 * 60 * 1000;

function getCached(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache(key, data) {
  cache.set(key, { data, timestamp: Date.now() });
}

// Registra um movimento de CHC de um usuário referido
const trackCHCMovement = async (influencerId, userId, type, amount) => {
  const realValue = parseFloat((amount / 1000).toFixed(2));
  await pool.query(
    `INSERT INTO chc_movements (influencer_id, user_id, movement_type, chc_amount, real_value)
     VALUES ($1, $2, $3, $4, $5)`,
    [influencerId, userId, type, amount, realValue]
  );
};

// GET /api/chc/total-moved
const getTotalCHCMoved = async (req, res) => {
  try {
    const influencerId = req.user.id;
    const { period = '30' } = req.query;
    const periodDays = parseInt(period);

    const cacheKey = `total-moved:${influencerId}:${periodDays}`;
    const cached = getCached(cacheKey);
    if (cached) return res.json({ data: cached });

    const result = await pool.query(
      `SELECT
         COALESCE(SUM(chc_amount), 0) AS total_chc,
         COALESCE(SUM(real_value), 0) AS total_real
       FROM chc_movements
       WHERE influencer_id = $1
       AND created_at >= CURRENT_DATE - INTERVAL '${periodDays} days'`,
      [influencerId]
    );

    const data = {
      total_chc_moved: parseInt(result.rows[0].total_chc),
      real_value: parseFloat(result.rows[0].total_real),
    };

    setCache(cacheKey, data);
    res.json({ data });
  } catch (error) {
    console.error('Erro ao buscar total CHC movimentado:', error);
    res.status(500).json({ error: 'Erro ao carregar total de CHC' });
  }
};

// GET /api/chc/average-per-user
const getAverageCHCPerUser = async (req, res) => {
  try {
    const influencerId = req.user.id;
    const { period = '30' } = req.query;
    const periodDays = parseInt(period);

    const cacheKey = `avg-per-user:${influencerId}:${periodDays}`;
    const cached = getCached(cacheKey);
    if (cached) return res.json({ data: cached });

    const result = await pool.query(
      `SELECT
         COUNT(DISTINCT user_id) AS unique_users,
         COALESCE(SUM(chc_amount), 0) AS total_chc
       FROM chc_movements
       WHERE influencer_id = $1
       AND created_at >= CURRENT_DATE - INTERVAL '${periodDays} days'`,
      [influencerId]
    );

    const uniqueUsers = parseInt(result.rows[0].unique_users);
    const totalCHC = parseInt(result.rows[0].total_chc);
    const averageCHC = uniqueUsers > 0 ? Math.round(totalCHC / uniqueUsers) : 0;

    const data = { average_chc_per_user: averageCHC, unique_users: uniqueUsers };
    setCache(cacheKey, data);
    res.json({ data });
  } catch (error) {
    console.error('Erro ao calcular média CHC por usuário:', error);
    res.status(500).json({ error: 'Erro ao calcular média de CHC' });
  }
};

// GET /api/chc/breakdown
const getCHCMovementBreakdown = async (req, res) => {
  try {
    const influencerId = req.user.id;
    const { period = '30' } = req.query;
    const periodDays = parseInt(period);

    const cacheKey = `breakdown:${influencerId}:${periodDays}`;
    const cached = getCached(cacheKey);
    if (cached) return res.json({ data: cached });

    // Total e média
    const totalsResult = await pool.query(
      `SELECT
         COALESCE(SUM(chc_amount), 0) AS total_chc,
         COALESCE(SUM(real_value), 0) AS total_real,
         COUNT(DISTINCT user_id) AS unique_users
       FROM chc_movements
       WHERE influencer_id = $1
       AND created_at >= CURRENT_DATE - INTERVAL '${periodDays} days'`,
      [influencerId]
    );

    const totalCHC = parseInt(totalsResult.rows[0].total_chc);
    const totalReal = parseFloat(totalsResult.rows[0].total_real);
    const uniqueUsers = parseInt(totalsResult.rows[0].unique_users);
    const averagePerUser = uniqueUsers > 0 ? Math.round(totalCHC / uniqueUsers) : 0;

    // Breakdown por tipo
    const byTypeResult = await pool.query(
      `SELECT
         movement_type,
         COALESCE(SUM(chc_amount), 0) AS chc
       FROM chc_movements
       WHERE influencer_id = $1
       AND created_at >= CURRENT_DATE - INTERVAL '${periodDays} days'
       GROUP BY movement_type`,
      [influencerId]
    );

    const byTypeMap = { earned: 0, spent: 0, purchased: 0, won: 0, lost: 0 };
    byTypeResult.rows.forEach(row => {
      byTypeMap[row.movement_type] = parseInt(row.chc);
    });

    const byType = {};
    Object.entries(byTypeMap).forEach(([type, chc]) => {
      byType[type] = {
        chc,
        percentage: totalCHC > 0 ? parseFloat(((chc / totalCHC) * 100).toFixed(1)) : 0,
      };
    });

    // Top usuários por movimentação (máx. 10, paginado pelo cliente)
    const topUsersResult = await pool.query(
      `SELECT
         user_id,
         COALESCE(SUM(chc_amount), 0) AS chc_moved
       FROM chc_movements
       WHERE influencer_id = $1
       AND created_at >= CURRENT_DATE - INTERVAL '${periodDays} days'
       GROUP BY user_id
       ORDER BY chc_moved DESC
       LIMIT 10`,
      [influencerId]
    );

    const topUsers = topUsersResult.rows.map(row => ({
      user_id: row.user_id,
      chc_moved: parseInt(row.chc_moved),
    }));

    // Tendência diária (últimos periodDays dias, agrupado por dia)
    const trendResult = await pool.query(
      `SELECT
         DATE(created_at) AS day,
         COALESCE(SUM(chc_amount), 0) AS chc
       FROM chc_movements
       WHERE influencer_id = $1
       AND created_at >= CURRENT_DATE - INTERVAL '${periodDays} days'
       GROUP BY DATE(created_at)
       ORDER BY day ASC`,
      [influencerId]
    );

    const trend = trendResult.rows.map(row => ({
      date: new Date(row.day).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
      chc: parseInt(row.chc),
    }));

    const data = {
      total_chc_moved: totalCHC,
      real_value: totalReal,
      average_per_user: averagePerUser,
      by_type: byType,
      top_users: topUsers,
      trend,
      period_days: periodDays,
    };

    setCache(cacheKey, data);
    res.json({ data });
  } catch (error) {
    console.error('Erro ao buscar breakdown de CHC:', error);
    res.status(500).json({ error: 'Erro ao carregar movimentação de CHC' });
  }
};

module.exports = {
  trackCHCMovement,
  getTotalCHCMoved,
  getAverageCHCPerUser,
  getCHCMovementBreakdown,
};
