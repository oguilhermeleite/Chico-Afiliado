const pool = require('../config/database');

// ─── Activity definitions ────────────────────────────────────────────────────
// Active:   last_activity_at within 7 days
// Inactive: last_activity_at 7-30 days ago
// Churned:  last_activity_at > 30 days ago

// GET /api/retention/overview
const getRetentionOverview = async (req, res) => {
  try {
    const influencerId = req.user.id;

    // Total paid conversions (unique users)
    const totalResult = await pool.query(
      `SELECT COUNT(*) AS total
       FROM conversions
       WHERE influencer_id = $1 AND status = 'paid'`,
      [influencerId]
    );
    const totalUsers = parseInt(totalResult.rows[0].total);

    // Active users (last_activity_at within 7 days)
    const activeResult = await pool.query(
      `SELECT COUNT(*) AS cnt
       FROM conversions
       WHERE influencer_id = $1 AND status = 'paid'
         AND last_activity_at >= NOW() - INTERVAL '7 days'`,
      [influencerId]
    );
    const activeUsers = parseInt(activeResult.rows[0].cnt);

    // Churned users (last_activity_at > 30 days ago or NULL after 30 days)
    const churnedResult = await pool.query(
      `SELECT COUNT(*) AS cnt
       FROM conversions
       WHERE influencer_id = $1 AND status = 'paid'
         AND (last_activity_at < NOW() - INTERVAL '30 days'
              OR (last_activity_at IS NULL AND converted_at < NOW() - INTERVAL '30 days'))`,
      [influencerId]
    );
    const churnedUsers = parseInt(churnedResult.rows[0].cnt);

    // Retention rates per period
    const retResult = await pool.query(
      `SELECT
         COUNT(*) FILTER (WHERE last_activity_at >= NOW() - INTERVAL '7 days')  AS ret_7,
         COUNT(*) FILTER (WHERE last_activity_at >= NOW() - INTERVAL '30 days') AS ret_30,
         COUNT(*) FILTER (WHERE last_activity_at >= NOW() - INTERVAL '60 days') AS ret_60,
         COUNT(*) AS total
       FROM conversions
       WHERE influencer_id = $1 AND status = 'paid'`,
      [influencerId]
    );

    const r = retResult.rows[0];
    const total = parseInt(r.total) || 1;
    const retentionRates = {
      '7_days':  Math.round((parseInt(r.ret_7)  / total) * 100),
      '30_days': Math.round((parseInt(r.ret_30) / total) * 100),
      '60_days': Math.round((parseInt(r.ret_60) / total) * 100),
    };

    // Retention by plan
    const planResult = await pool.query(
      `SELECT
         plan_type,
         COUNT(*) AS total,
         COUNT(*) FILTER (WHERE last_activity_at >= NOW() - INTERVAL '30 days') AS active_30,
         COALESCE(AVG(days_since_signup), 0) AS avg_days
       FROM conversions
       WHERE influencer_id = $1 AND status = 'paid'
         AND plan_type IN ('start','pro','goat')
       GROUP BY plan_type`,
      [influencerId]
    );

    const byPlan = {
      start: { retention_30d: 0, avg_activity_days: 0 },
      pro:   { retention_30d: 0, avg_activity_days: 0 },
      goat:  { retention_30d: 0, avg_activity_days: 0 },
    };
    planResult.rows.forEach(row => {
      const t = parseInt(row.total) || 1;
      byPlan[row.plan_type] = {
        retention_30d:    Math.round((parseInt(row.active_30) / t) * 100),
        avg_activity_days: Math.round(parseFloat(row.avg_days)),
      };
    });

    // Upgrade rate (conversions with previous_plan set)
    const upgradeResult = await pool.query(
      `SELECT
         COUNT(*) AS upgrades,
         COUNT(*) FILTER (WHERE previous_plan = 'free'  AND plan_type = 'start') AS free_to_start,
         COUNT(*) FILTER (WHERE previous_plan = 'start' AND plan_type = 'pro')  AS start_to_pro,
         COUNT(*) FILTER (WHERE previous_plan = 'pro'   AND plan_type = 'goat') AS pro_to_goat
       FROM conversions
       WHERE influencer_id = $1 AND status = 'paid' AND previous_plan IS NOT NULL`,
      [influencerId]
    );
    const up = upgradeResult.rows[0];
    const upgradeCount = parseInt(up.upgrades);
    const upgradeRate = totalUsers > 0 ? Math.round((upgradeCount / totalUsers) * 100) : 0;

    // Average lifetime (days since signup for all paid users)
    const lifetimeResult = await pool.query(
      `SELECT COALESCE(AVG(days_since_signup), 0) AS avg_lt
       FROM conversions
       WHERE influencer_id = $1 AND status = 'paid'`,
      [influencerId]
    );
    const avgLifetimeDays = Math.round(parseFloat(lifetimeResult.rows[0].avg_lt));

    res.json({
      data: {
        total_users: totalUsers,
        active_users: activeUsers,
        churned_users: churnedUsers,
        retention_rates: retentionRates,
        by_plan: byPlan,
        upgrade_rate: upgradeRate,
        upgrade_paths: [
          { from: 'free',  to: 'start', count: parseInt(up.free_to_start) },
          { from: 'start', to: 'pro',   count: parseInt(up.start_to_pro)  },
          { from: 'pro',   to: 'goat',  count: parseInt(up.pro_to_goat)   },
        ],
        average_lifetime_days: avgLifetimeDays,
      },
    });
  } catch (error) {
    console.error('Erro ao buscar retenção:', error);
    res.status(500).json({ message: 'Erro ao carregar dados de retenção' });
  }
};

// GET /api/retention/user-activity
const getUserActivity = async (req, res) => {
  try {
    const influencerId = req.user.id;
    const { sort = 'activity', order = 'asc', limit = 50, offset = 0 } = req.query;

    const orderClause = sort === 'activity'
      ? `last_activity_at ${order.toUpperCase()} NULLS LAST`
      : `converted_at DESC`;

    const result = await pool.query(
      `SELECT
         id,
         user_id,
         plan_type,
         converted_at,
         last_activity_at,
         is_active,
         days_since_signup,
         EXTRACT(DAY FROM NOW() - last_activity_at)::INTEGER AS days_since_activity
       FROM conversions
       WHERE influencer_id = $1 AND status = 'paid'
       ORDER BY ${orderClause}
       LIMIT $2 OFFSET $3`,
      [influencerId, parseInt(limit), parseInt(offset)]
    );

    res.json({
      data: result.rows.map(row => ({
        ...row,
        activity_status:
          !row.days_since_activity || row.days_since_activity < 7  ? 'active'
          : row.days_since_activity < 30 ? 'inactive'
          : 'churned',
      })),
    });
  } catch (error) {
    console.error('Erro ao buscar atividade de usuários:', error);
    res.status(500).json({ message: 'Erro ao carregar atividade' });
  }
};

// Called by platform events to update a user's last activity
const trackActivity = async (req, res) => {
  try {
    const influencerId = req.user.id;
    const { user_id } = req.body;
    if (!user_id) return res.status(400).json({ message: 'user_id obrigatório' });

    await pool.query(
      `UPDATE conversions
       SET last_activity_at = NOW(), is_active = true, churn_date = NULL
       WHERE influencer_id = $1 AND user_id = $2 AND status = 'paid'`,
      [influencerId, user_id]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Erro ao registrar atividade:', error);
    res.status(500).json({ message: 'Erro ao registrar atividade' });
  }
};

module.exports = { getRetentionOverview, getUserActivity, trackActivity };
