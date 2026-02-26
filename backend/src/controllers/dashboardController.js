const pool = require('../config/database');

const getMetrics = async (req, res) => {
  try {
    const influencerId = req.user.id;
    const { period = '30' } = req.query;

    const periodDays = parseInt(period);

    // Ganhos do mês atual
    const monthEarnings = await pool.query(
      `SELECT COALESCE(SUM(amount), 0) as total
       FROM conversions
       WHERE influencer_id = $1
       AND status = 'paid'
       AND converted_at >= DATE_TRUNC('month', CURRENT_DATE)`,
      [influencerId]
    );

    // Total de usuários pagantes
    const totalPaying = await pool.query(
      `SELECT COUNT(DISTINCT user_id) as total
       FROM conversions
       WHERE influencer_id = $1
       AND status = 'paid'`,
      [influencerId]
    );

    // Conversões hoje
    const todayConversions = await pool.query(
      `SELECT COUNT(*) as total
       FROM conversions
       WHERE influencer_id = $1
       AND converted_at >= CURRENT_DATE`,
      [influencerId]
    );

    // Conversões esta semana
    const weekConversions = await pool.query(
      `SELECT COUNT(*) as total
       FROM conversions
       WHERE influencer_id = $1
       AND converted_at >= DATE_TRUNC('week', CURRENT_DATE)`,
      [influencerId]
    );

    // Conversões este mês
    const monthConversions = await pool.query(
      `SELECT COUNT(*) as total
       FROM conversions
       WHERE influencer_id = $1
       AND converted_at >= DATE_TRUNC('month', CURRENT_DATE)`,
      [influencerId]
    );

    // Total de cliques/visitantes (todos os registros no período)
    const totalVisitors = await pool.query(
      `SELECT COUNT(*) as total
       FROM conversions
       WHERE influencer_id = $1
       AND converted_at >= CURRENT_DATE - INTERVAL '${periodDays} days'`,
      [influencerId]
    );

    // Conversões pagas no período
    const paidInPeriod = await pool.query(
      `SELECT COUNT(*) as total
       FROM conversions
       WHERE influencer_id = $1
       AND status = 'paid'
       AND converted_at >= CURRENT_DATE - INTERVAL '${periodDays} days'`,
      [influencerId]
    );

    // Taxa de conversão
    const totalAll = parseInt(totalVisitors.rows[0].total) || 0;
    const totalPaid = parseInt(paidInPeriod.rows[0].total) || 0;
    const conversionRate = totalAll > 0 ? ((totalPaid / totalAll) * 100).toFixed(1) : '0.0';

    // Ticket médio
    const avgTicket = await pool.query(
      `SELECT COALESCE(AVG(amount), 0) as average
       FROM conversions
       WHERE influencer_id = $1
       AND status = 'paid'
       AND converted_at >= CURRENT_DATE - INTERVAL '${periodDays} days'`,
      [influencerId]
    );

    // Ganhos pendentes
    const pendingEarnings = await pool.query(
      `SELECT COALESCE(SUM(amount), 0) as total
       FROM conversions
       WHERE influencer_id = $1
       AND status = 'pending'`,
      [influencerId]
    );

    res.json({
      metrics: {
        monthEarnings: parseFloat(monthEarnings.rows[0].total),
        totalPaying: parseInt(totalPaying.rows[0].total),
        todayConversions: parseInt(todayConversions.rows[0].total),
        weekConversions: parseInt(weekConversions.rows[0].total),
        monthConversions: parseInt(monthConversions.rows[0].total),
        conversionRate: parseFloat(conversionRate),
        avgTicket: parseFloat(parseFloat(avgTicket.rows[0].average).toFixed(2)),
        pendingEarnings: parseFloat(pendingEarnings.rows[0].total),
      },
    });
  } catch (error) {
    console.error('Erro ao buscar métricas:', error);
    res.status(500).json({ message: 'Erro ao carregar métricas' });
  }
};

const getConversions = async (req, res) => {
  try {
    const influencerId = req.user.id;
    const { page = 1, limit = 20, status } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);

    let query = `
      SELECT id, user_id, user_name, amount, status, converted_at, created_at, plan_type, monthly_value
      FROM conversions
      WHERE influencer_id = $1
    `;
    const params = [influencerId];

    if (status && ['pending', 'paid'].includes(status)) {
      query += ` AND status = $${params.length + 1}`;
      params.push(status);
    }

    query += ` ORDER BY converted_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(parseInt(limit), offset);

    const result = await pool.query(query, params);

    const countQuery = `
      SELECT COUNT(*) as total
      FROM conversions
      WHERE influencer_id = $1
      ${status ? `AND status = '${status}'` : ''}
    `;
    const countResult = await pool.query(countQuery, [influencerId]);

    res.json({
      conversions: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(countResult.rows[0].total),
        totalPages: Math.ceil(parseInt(countResult.rows[0].total) / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('Erro ao buscar conversões:', error);
    res.status(500).json({ message: 'Erro ao carregar conversões' });
  }
};

module.exports = {
  getMetrics,
  getConversions,
};
