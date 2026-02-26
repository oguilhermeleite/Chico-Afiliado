require('dotenv').config();
const pool = require('./src/config/database');

async function testConnection() {
  try {
    console.log('🔌 Testando conexão com o banco de dados...');
    console.log('   URL:', process.env.DATABASE_URL?.replace(/:([^:@]+)@/, ':****@'));

    const result = await pool.query('SELECT NOW() as agora, version() as versao');
    console.log('\n✅ Conexão bem-sucedida!');
    console.log('   Hora do servidor:', result.rows[0].agora);
    console.log('   Versão PostgreSQL:', result.rows[0].versao.split(' ').slice(0, 2).join(' '));

    // Testar se as tabelas existem
    const tables = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);

    if (tables.rows.length > 0) {
      console.log('\n📋 Tabelas encontradas:');
      tables.rows.forEach(t => console.log('   -', t.table_name));
    } else {
      console.log('\n⚠️  Nenhuma tabela encontrada. Execute: npm run migrate');
    }

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Falha na conexão:', error.message);
    console.error('\n💡 Verifique:');
    console.error('   1. DATABASE_URL no arquivo .env está correto');
    console.error('   2. O banco de dados está em execução');
    console.error('   3. Usuário e senha estão corretos');
    process.exit(1);
  }
}

testConnection();
