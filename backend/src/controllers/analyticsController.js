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

module.exports = {
  getConversionsByPlan,
};
