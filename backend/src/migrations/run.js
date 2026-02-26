const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const pool = require('../config/database');

// Lista de arquivos de migração em ordem
const migrationFiles = [
  '001_create_tables.sql',
  '002_add_instagram_fields.sql',
  '003_add_plan_tracking_fields.sql',
  '004_add_commission_fields.sql',
  '005_add_chc_movements.sql',
  '006_add_retention_fields.sql',
  '007_align_with_main_backend.sql',
];

async function runMigrations() {
  try {
    console.log('🔄 Executando migrações...\n');

    for (const file of migrationFiles) {
      const migrationPath = path.join(__dirname, file);

      if (!fs.existsSync(migrationPath)) {
        console.log(`⏭️  Pulando ${file} (arquivo não encontrado)`);
        continue;
      }

      console.log(`📄 Executando: ${file}`);
      const sql = fs.readFileSync(migrationPath, 'utf8');
      await pool.query(sql);
      console.log(`✅ ${file} executado com sucesso!`);
    }

    console.log('\n✅ Todas as migrações executadas com sucesso!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Erro ao executar migrações:', error.message);
    process.exit(1);
  }
}

runMigrations();
