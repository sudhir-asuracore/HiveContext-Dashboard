const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

let dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  const envPath = path.join(__dirname, '.env.local');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf-8');
    for (const line of content.split('\n')) {
      if (line.startsWith('DATABASE_URL=')) {
        dbUrl = line.split('=', 2)[1].trim().replace(/^["']|["']$/g, '');
        break;
      }
    }
  }
}

if (dbUrl) {
  dbUrl = dbUrl.replace('sslmode=verify-full', 'sslmode=require')
               .replace('&sslrootcert=system', '')
               .replace('?sslrootcert=system&', '?');
}

const pool = new Pool({
  connectionString: dbUrl,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  try {
    console.log("Applying Memory Scoping migrations to CockroachDB...");
    
    await pool.query(`
      ALTER TABLE hive_context ADD COLUMN IF NOT EXISTS scope VARCHAR(20) DEFAULT 'global';
    `);
    
    await pool.query(`
      ALTER TABLE hive_context ADD COLUMN IF NOT EXISTS project_name VARCHAR(100);
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS hive_context_tenant_scope_proj_idx ON hive_context (tenant_id, scope, project_name);
    `);

    console.log("Migration successful! `scope` and `project_name` added to CockroachDB.");
  } catch (error) {
    console.error("Migration error:", error);
  } finally {
    await pool.end();
  }
}

run();
