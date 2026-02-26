const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const pool = require('../config/database');

async function seed() {
  try {
    console.log('🌱 Inserindo dados de teste...');

    // Criar influenciador de teste
    const id = uuidv4();
    const passwordHash = await bcrypt.hash('123456', 12);

    await pool.query(
      `INSERT INTO influencers (id, name, email, password_hash, referral_code, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
       ON CONFLICT (email) DO NOTHING`,
      [id, 'Afiliado Teste', 'teste@chicoai.com', passwordHash, 'CHICO_TESTE001']
    );

    // Criar conversões de exemplo
    const statuses = ['paid', 'pending'];
    const names = ['João S.', 'Maria L.', 'Carlos M.', 'Ana P.', 'Pedro R.', 'Lucia F.', 'Roberto G.', 'Fernanda A.'];
    const plans = [
      { type: 'start', monthlyValue: 19.90 },
      { type: 'pro',   monthlyValue: 29.90 },
      { type: 'goat',  monthlyValue: 49.90 },
    ];

    for (let i = 0; i < 25; i++) {
      const daysAgo = Math.floor(Math.random() * 60);
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      const userName = names[Math.floor(Math.random() * names.length)];
      const plan = plans[Math.floor(Math.random() * plans.length)];

      // Determinar se esta conversão é um upgrade (aproximadamente 20% das conversões)
      const isUpgrade = i > 0 && Math.random() < 0.2 && plan.type === 'pro';
      const previousPlan = isUpgrade ? 'start' : null;
      const upgradeDate = isUpgrade ? `NOW() - INTERVAL '${Math.floor(daysAgo / 2)} days'` : 'NULL';

      await pool.query(
        `INSERT INTO conversions (id, influencer_id, user_id, user_name, amount, status, converted_at, created_at, plan_type, previous_plan, plan_upgraded_at, monthly_value)
         VALUES ($1, $2, $3, $4, $5, $6, NOW() - INTERVAL '${daysAgo} days', NOW(), $7, $8, ${upgradeDate}, $9)`,
        [uuidv4(), id, uuidv4(), userName, plan.monthlyValue, status, plan.type, previousPlan, plan.monthlyValue]
      );
    }

    console.log('✅ Dados de teste inseridos!');
    console.log('');
    console.log('📧 Login de teste:');
    console.log('   Email: teste@chicoai.com');
    console.log('   Senha: 123456');
    console.log('');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro ao inserir dados:', error.message);
    process.exit(1);
  }
}

seed();
