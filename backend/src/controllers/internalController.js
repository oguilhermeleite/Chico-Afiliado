/**
 * Internal Controller — Endpoints chamados pelo backend principal (Chico-Back).
 * Todos protegidos por serviceAuth middleware.
 */
const pool = require('../config/database');

/**
 * GET /api/internal/validate/:code
 * Valida se um código de referência existe. Usado pelo Chico-Back antes do registro.
 */
const validateCode = async (req, res) => {
  const { code } = req.params;
  try {
    const result = await pool.query(
      'SELECT id, name FROM influencers WHERE referral_code = $1',
      [code]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ valid: false, message: 'Código de referência inválido' });
    }
    res.json({ valid: true, influencer_name: result.rows[0].name });
  } catch (error) {
    console.error('[internal] validateCode error:', error);
    res.status(500).json({ message: 'Erro ao validar código' });
  }
};

/**
 * POST /api/internal/conversion
 * Registra nova conversão quando usuário se cadastra via link de referência.
 * Body: { referral_code, user_id, user_name, plan_type? }
 */
const createConversion = async (req, res) => {
  const { referral_code, user_id, user_name, plan_type = 'free' } = req.body;

  if (!referral_code || !user_id) {
    return res.status(400).json({ message: 'referral_code e user_id são obrigatórios' });
  }

  try {
    // 1. Encontrar influencer pelo código
    const influencerResult = await pool.query(
      'SELECT id, name FROM influencers WHERE referral_code = $1',
      [referral_code]
    );
    if (influencerResult.rows.length === 0) {
      return res.status(404).json({ message: 'Código de referência inválido' });
    }
    const influencer = influencerResult.rows[0];

    // 2. Evitar duplicatas para o mesmo user_id + influencer
    const existing = await pool.query(
      'SELECT id FROM conversions WHERE user_id = $1 AND influencer_id = $2',
      [String(user_id), influencer.id]
    );
    if (existing.rows.length > 0) {
      return res.status(200).json({ message: 'Conversão já registrada', conversion_id: existing.rows[0].id });
    }

    // 3. Buscar valor do plano no catálogo
    const planResult = await pool.query(
      'SELECT monthly_value FROM plan_catalog WHERE plan_type = $1',
      [plan_type]
    );
    const planMonthlyValue = parseFloat(planResult.rows[0]?.monthly_value || 0);

    // 4. Inserir conversão com status pending e valores zerados até pagamento
    const convResult = await pool.query(
      `INSERT INTO conversions
         (influencer_id, user_id, user_name, plan_type, status,
          amount, commission_amount, monthly_value, plan_monthly_value,
          converted_at, created_at, updated_at)
       VALUES ($1, $2, $3, $4, 'pending', 0, 0, $5, $5, NOW(), NOW(), NOW())
       RETURNING id`,
      [influencer.id, String(user_id), user_name || null, plan_type, planMonthlyValue]
    );

    res.status(201).json({
      message: 'Conversão registrada',
      conversion_id: convResult.rows[0].id,
    });
  } catch (error) {
    console.error('[internal] createConversion error:', error);
    res.status(500).json({ message: 'Erro ao registrar conversão' });
  }
};

/**
 * POST /api/internal/payment-confirmed
 * Marca conversão como paga e registra comissão. Chamado após Stripe webhook.
 * Body: { user_id, plan_type, amount? }
 */
const confirmPayment = async (req, res) => {
  const { user_id, plan_type, amount } = req.body;

  if (!user_id) {
    return res.status(400).json({ message: 'user_id é obrigatório' });
  }

  try {
    const effectivePlan = plan_type || 'start';

    // Buscar valores do plano no catálogo
    const planResult = await pool.query(
      'SELECT monthly_value, commission_amount FROM plan_catalog WHERE plan_type = $1',
      [effectivePlan]
    );
    const planData = planResult.rows[0];
    const planValue = amount != null ? parseFloat(amount) : parseFloat(planData?.monthly_value || 0);
    const commissionValue = parseFloat(planData?.commission_amount || (planValue * 0.20).toFixed(2));

    // Atualizar todas as conversões pendentes deste usuário
    const result = await pool.query(
      `UPDATE conversions
       SET status = 'paid',
           plan_type = $1,
           amount = $2,
           commission_amount = $3,
           monthly_value = $2,
           plan_monthly_value = $2,
           paid_at = NOW(),
           updated_at = NOW()
       WHERE user_id = $4
         AND status = 'pending'
       RETURNING id, commission_amount`,
      [effectivePlan, planValue, commissionValue, String(user_id)]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Nenhuma conversão pendente encontrada para este usuário' });
    }

    res.json({
      message: 'Pagamento confirmado',
      conversions_updated: result.rows.length,
      commission_amount: commissionValue,
    });
  } catch (error) {
    console.error('[internal] confirmPayment error:', error);
    res.status(500).json({ message: 'Erro ao confirmar pagamento' });
  }
};

/**
 * POST /api/internal/upgrade
 * Registra upgrade de plano de um usuário.
 * Body: { user_id, new_plan_type }
 */
const upgradeConversion = async (req, res) => {
  const { user_id, new_plan_type } = req.body;

  if (!user_id || !new_plan_type) {
    return res.status(400).json({ message: 'user_id e new_plan_type são obrigatórios' });
  }

  try {
    const planResult = await pool.query(
      'SELECT monthly_value, commission_amount FROM plan_catalog WHERE plan_type = $1',
      [new_plan_type]
    );
    if (planResult.rows.length === 0) {
      return res.status(400).json({ message: `Plano inválido: ${new_plan_type}` });
    }
    const { monthly_value, commission_amount } = planResult.rows[0];

    const result = await pool.query(
      `UPDATE conversions
       SET plan_type = $1,
           amount = $2,
           commission_amount = $3,
           monthly_value = $2,
           plan_monthly_value = $2,
           updated_at = NOW()
       WHERE user_id = $4
       RETURNING id`,
      [new_plan_type, parseFloat(monthly_value), parseFloat(commission_amount), String(user_id)]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Conversão não encontrada para este usuário' });
    }

    res.json({ message: 'Plano atualizado', new_plan: new_plan_type, commission_amount: parseFloat(commission_amount) });
  } catch (error) {
    console.error('[internal] upgradeConversion error:', error);
    res.status(500).json({ message: 'Erro ao atualizar plano' });
  }
};

/**
 * POST /api/internal/chc-movement
 * Registra movimentação de CHC de um usuário no dashboard do influencer.
 * Body: { user_id, movement_type, chc_amount, description? }
 */
const trackCHCMovement = async (req, res) => {
  const { user_id, movement_type, chc_amount, description } = req.body;

  if (!user_id || !movement_type || chc_amount == null) {
    return res.status(400).json({ message: 'user_id, movement_type e chc_amount são obrigatórios' });
  }

  const validTypes = ['earned', 'spent', 'purchased', 'won', 'lost'];
  if (!validTypes.includes(movement_type)) {
    return res.status(400).json({ message: `movement_type inválido. Use: ${validTypes.join(', ')}` });
  }

  try {
    // Encontrar o influencer que indicou este usuário
    const convResult = await pool.query(
      'SELECT influencer_id FROM conversions WHERE user_id = $1 LIMIT 1',
      [String(user_id)]
    );
    if (convResult.rows.length === 0) {
      // Usuário não veio por indicação — ignorar silenciosamente
      return res.json({ message: 'Usuário sem afiliado. Movimento não registrado.' });
    }

    const influencer_id = convResult.rows[0].influencer_id;
    const real_value = parseFloat((parseInt(chc_amount) / 1000).toFixed(4)); // 1000 CHC = R$ 1,00

    await pool.query(
      `INSERT INTO chc_movements
         (influencer_id, user_id, movement_type, chc_amount, real_value, description, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
      [influencer_id, String(user_id), movement_type, parseInt(chc_amount), real_value, description || null]
    );

    res.status(201).json({ message: 'Movimento CHC registrado' });
  } catch (error) {
    console.error('[internal] trackCHCMovement error:', error);
    res.status(500).json({ message: 'Erro ao registrar movimento CHC' });
  }
};

/**
 * POST /api/internal/activity
 * Atualiza timestamp de última atividade (para métricas de retenção).
 * Body: { user_id }
 */
const trackActivity = async (req, res) => {
  const { user_id } = req.body;
  if (!user_id) return res.status(400).json({ message: 'user_id é obrigatório' });

  try {
    await pool.query(
      `UPDATE conversions
       SET last_activity_at = NOW(), is_active = TRUE, days_since_activity = 0, updated_at = NOW()
       WHERE user_id = $1`,
      [String(user_id)]
    );
    res.json({ message: 'Atividade registrada' });
  } catch (error) {
    console.error('[internal] trackActivity error:', error);
    res.status(500).json({ message: 'Erro ao registrar atividade' });
  }
};

/**
 * POST /api/internal/churn
 * Registra que um usuário cancelou a assinatura.
 * Body: { user_id }
 */
const trackChurn = async (req, res) => {
  const { user_id } = req.body;
  if (!user_id) return res.status(400).json({ message: 'user_id é obrigatório' });

  try {
    await pool.query(
      `UPDATE conversions
       SET is_active = FALSE, updated_at = NOW()
       WHERE user_id = $1`,
      [String(user_id)]
    );
    res.json({ message: 'Churn registrado' });
  } catch (error) {
    console.error('[internal] trackChurn error:', error);
    res.status(500).json({ message: 'Erro ao registrar churn' });
  }
};

module.exports = {
  validateCode,
  createConversion,
  confirmPayment,
  upgradeConversion,
  trackCHCMovement,
  trackActivity,
  trackChurn,
};
