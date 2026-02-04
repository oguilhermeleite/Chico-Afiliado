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

    for (let i = 0; i < 25; i++) {
      const daysAgo = Math.floor(Math.random() * 60);
      const amount = (Math.random() * 500 + 50).toFixed(2);
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      const userName = names[Math.floor(Math.random() * names.length)];

      await pool.query(
        `INSERT INTO conversions (id, influencer_id, user_id, user_name, amount, status, converted_at, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW() - INTERVAL '${daysAgo} days', NOW())`,
        [uuidv4(), id, uuidv4(), userName, amount, status]
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
