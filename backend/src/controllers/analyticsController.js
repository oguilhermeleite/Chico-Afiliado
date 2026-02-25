const pool = require('../config/database');

// Get conversions breakdown by plan type
const getConversionsByPlan = async (req, res) => {
  try {
    const influencerId = req.user.id;
    const { period = '30' } = req.query;
    const periodDays = parseInt(period);

    // Total de conversões pagas no período
    const totalResult = await pool.query(
      `SELECT COUNT(*) as count, COALESCE(SUM(monthly_value), 0) as total_value
       FROM conversions
       WHERE influencer_id = $1
       AND status = 'paid'
       AND converted_at >= CURRENT_DATE - INTERVAL '${periodDays} days'`,
      [influencerId]
    );

    const totalConversions = parseInt(totalResult.rows[0].count);
    const totalValue = parseFloat(totalResult.rows[0].total_value);

    // Conversões por plano
    const byPlanResult = await pool.query(
      `SELECT
         plan_type,
         COUNT(*) as count,
         COALESCE(SUM(monthly_value), 0) as total_value
       FROM conversions
       WHERE influencer_id = $1
       AND status = 'paid'
       AND converted_at >= CURRENT_DATE - INTERVAL '${periodDays} days'
       GROUP BY plan_type
       ORDER BY plan_type`,
      [influencerId]
    );

    // Formatar dados por plano
    const byPlan = {
      free: { count: 0, percentage: 0, total_value: 0 },
      starter: { count: 0, percentage: 0, total_value: 0 },
      pro: { count: 0, percentage: 0, total_value: 0 },
    };

    byPlanResult.rows.forEach(row => {
      const count = parseInt(row.count);
      const value = parseFloat(row.total_value);
      byPlan[row.plan_type] = {
        count,
        percentage: totalConversions > 0 ? parseFloat(((count / totalConversions) * 100).toFixed(1)) : 0,
        total_value: value,
      };
    });

    // Total de upgrades (conversões onde previous_plan não é NULL)
    const upgradesResult = await pool.query(
      `SELECT COUNT(*) as count
       FROM conversions
       WHERE influencer_id = $1
       AND status = 'paid'
       AND previous_plan IS NOT NULL
       AND converted_at >= CURRENT_DATE - INTERVAL '${periodDays} days'`,
      [influencerId]
    );

    const totalUpgrades = parseInt(upgradesResult.rows[0].count);

    // Detalhes dos upgrades (de qual plano para qual plano)
    const upgradePathsResult = await pool.query(
      `SELECT
         previous_plan,
         plan_type as current_plan,
         COUNT(*) as count
       FROM conversions
       WHERE influencer_id = $1
       AND status = 'paid'
       AND previous_plan IS NOT NULL
       AND converted_at >= CURRENT_DATE - INTERVAL '${periodDays} days'
       GROUP BY previous_plan, plan_type
       ORDER BY count DESC`,
      [influencerId]
    );

    const upgradePaths = upgradePathsResult.rows.map(row => ({
      from: row.previous_plan,
      to: row.current_plan,
      count: parseInt(row.count),
    }));

    res.json({
      data: {
        total_conversions: totalConversions,
        total_value: totalValue,
        by_plan: byPlan,
        upgrades: {
          total: totalUpgrades,
          paths: upgradePaths,
        },
      },
    });
  } catch (error) {
    console.error('Erro ao buscar conversões por plano:', error);
    res.status(500).json({ error: 'Erro ao carregar analytics de planos' });
  }
};

// Get commission breakdown by plan type
const getCommissionBreakdown = async (req, res) => {
  try {
    const influencerId = req.user.id;
    const { period = '30' } = req.query;
    const periodDays = parseInt(period);

    // Total commissions (paid + pending) in period
    const totalsResult = await pool.query(
      `SELECT
         COALESCE(SUM(CASE WHEN status = 'paid' THEN commission_amount ELSE 0 END), 0) as total_paid,
         COALESCE(SUM(CASE WHEN status = 'pending' THEN commission_amount ELSE 0 END), 0) as total_pending,
         COALESCE(SUM(commission_amount), 0) as total_all
       FROM conversions
       WHERE influencer_id = $1
       AND converted_at >= CURRENT_DATE - INTERVAL '${periodDays} days'`,
      [influencerId]
    );

    const totals = {
      paid: parseFloat(totalsResult.rows[0].total_paid),
      pending: parseFloat(totalsResult.rows[0].total_pending),
      total: parseFloat(totalsResult.rows[0].total_all),
    };

    // Breakdown by plan type
    const byPlanResult = await pool.query(
      `SELECT
         plan_type,
         COUNT(*) as conversions_count,
         COALESCE(SUM(CASE WHEN status = 'paid' THEN commission_amount ELSE 0 END), 0) as commission_paid,
         COALESCE(SUM(CASE WHEN status = 'pending' THEN commission_amount ELSE 0 END), 0) as commission_pending,
         COALESCE(SUM(commission_amount), 0) as commission_total,
         COALESCE(AVG(plan_monthly_value), 0) as avg_plan_value
       FROM conversions
       WHERE influencer_id = $1
       AND converted_at >= CURRENT_DATE - INTERVAL '${periodDays} days'
       GROUP BY plan_type
       ORDER BY plan_type`,
      [influencerId]
    );

    // Format by_plan data
    const byPlan = {
      free: {
        conversions: 0,
        commission_paid: 0,
        commission_pending: 0,
        commission_total: 0,
        avg_plan_value: 0,
      },
      starter: {
        conversions: 0,
        commission_paid: 0,
        commission_pending: 0,
        commission_total: 0,
        avg_plan_value: 19.90,
      },
      pro: {
        conversions: 0,
        commission_paid: 0,
        commission_pending: 0,
        commission_total: 0,
        avg_plan_value: 49.90,
      },
    };

    byPlanResult.rows.forEach(row => {
      byPlan[row.plan_type] = {
        conversions: parseInt(row.conversions_count),
        commission_paid: parseFloat(row.commission_paid),
        commission_pending: parseFloat(row.commission_pending),
        commission_total: parseFloat(row.commission_total),
        avg_plan_value: parseFloat(row.avg_plan_value),
      };
    });

    // Commission from upgrades
    const upgradesResult = await pool.query(
      `SELECT
         COUNT(*) as count,
         COALESCE(SUM(commission_amount), 0) as total_commission
       FROM conversions
       WHERE influencer_id = $1
       AND status = 'paid'
       AND previous_plan IS NOT NULL
       AND converted_at >= CURRENT_DATE - INTERVAL '${periodDays} days'`,
      [influencerId]
    );

    const upgrades = {
      count: parseInt(upgradesResult.rows[0].count),
      total_commission: parseFloat(upgradesResult.rows[0].total_commission),
    };

    res.json({
      data: {
        totals,
        by_plan: byPlan,
        upgrades,
        period_days: periodDays,
      },
    });
  } catch (error) {
    console.error('Erro ao buscar breakdown de comissões:', error);
    res.status(500).json({ error: 'Erro ao carregar comissões' });
  }
};

// Get list of users who upgraded plans
const getPlanUpgrades = async (req, res) => {
  try {
    const influencerId = req.user.id;
    const { period = '30' } = req.query;
    const periodDays = parseInt(period);

    const result = await pool.query(
      `SELECT
         user_id,
         user_name,
         previous_plan,
         plan_type as current_plan,
         plan_upgraded_at,
         monthly_value
       FROM conversions
       WHERE influencer_id = $1
       AND previous_plan IS NOT NULL
       AND plan_upgraded_at >= CURRENT_DATE - INTERVAL '${periodDays} days'
       ORDER BY plan_upgraded_at DESC
       LIMIT 50`,
      [influencerId]
    );

    const countResult = await pool.query(
      `SELECT COUNT(*) as total
       FROM conversions
       WHERE influencer_id = $1
       AND previous_plan IS NOT NULL
       AND plan_upgraded_at >= CURRENT_DATE - INTERVAL '${periodDays} days'`,
      [influencerId]
    );

    res.json({
      data: {
        total_upgrades: parseInt(countResult.rows[0].total),
        upgrades: result.rows.map(row => ({
          user_id: row.user_id,
          user_name: row.user_name || row.user_id?.substring(0, 8) || '—',
          from_plan: row.previous_plan,
          to_plan: row.current_plan,
          upgraded_at: row.plan_upgraded_at,
          monthly_value: parseFloat(row.monthly_value || 0),
        })),
      },
    });
  } catch (error) {
    console.error('Erro ao buscar upgrades de plano:', error);
    res.status(500).json({ error: 'Erro ao carregar upgrades de plano' });
  }
};

// Get percentage distribution of plans
const getPlanDistribution = async (req, res) => {
  try {
    const influencerId = req.user.id;
    const { period = '30' } = req.query;
    const periodDays = parseInt(period);

    const result = await pool.query(
      `SELECT
         plan_type,
         COUNT(*) as count
       FROM conversions
       WHERE influencer_id = $1
       AND status = 'paid'
       AND converted_at >= CURRENT_DATE - INTERVAL '${periodDays} days'
       GROUP BY plan_type`,
      [influencerId]
    );

    const totalResult = await pool.query(
      `SELECT COUNT(*) as total
       FROM conversions
       WHERE influencer_id = $1
       AND status = 'paid'
       AND converted_at >= CURRENT_DATE - INTERVAL '${periodDays} days'`,
      [influencerId]
    );

    const total = parseInt(totalResult.rows[0].total);

    const distribution = {
      free: { count: 0, percentage: 0 },
      starter: { count: 0, percentage: 0 },
      pro: { count: 0, percentage: 0 },
    };

    result.rows.forEach(row => {
      const count = parseInt(row.count);
      if (distribution[row.plan_type] !== undefined) {
        distribution[row.plan_type] = {
          count,
          percentage: total > 0 ? parseFloat(((count / total) * 100).toFixed(1)) : 0,
        };
      }
    });

    res.json({
      data: {
        total_conversions: total,
        distribution,
      },
    });
  } catch (error) {
    console.error('Erro ao buscar distribuição de planos:', error);
    res.status(500).json({ error: 'Erro ao carregar distribuição de planos' });
  }
};

module.exports = {
  getConversionsByPlan,
  getCommissionBreakdown,
  getPlanUpgrades,
  getPlanDistribution,
};
