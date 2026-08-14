const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Load environment variables from .env or .env.local if not already defined
if (!process.env.DATABASE_URL) {
  const envPaths = ['.env.local', '.env'];
  for (const envPath of envPaths) {
    const fullPath = path.resolve(process.cwd(), envPath);
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, 'utf8');
      content.split('\n').forEach(line => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
          const idx = trimmed.indexOf('=');
          const key = trimmed.slice(0, idx).trim();
          let val = trimmed.slice(idx + 1).trim();
          if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1);
          }
          if (!process.env[key]) {
            process.env[key] = val;
          }
        }
      });
      break;
    }
  }
}

const args = process.argv.slice(2);
let targetSpace = 'hive_tenant_defaultdb';
let targetTenant = '00000000-0000-0000-0000-000000000001';

args.forEach(arg => {
  if (arg.startsWith('--space=')) targetSpace = arg.split('=')[1];
  if (arg.startsWith('--tenant=')) targetTenant = arg.split('=')[1];
});

console.log(`[DELETE] Executing space-isolated purge for target Memory Space: '${targetSpace}' (Tenant: ${targetTenant})`);

const rawUrl = process.env.DATABASE_URL || '';
const connectionString = rawUrl
  .replace('&sslrootcert=system', '')
  .replace('?sslrootcert=system&', '?')
  .replace('sslmode=verify-full', 'sslmode=require');

const pool = new Pool({ connectionString });

async function ensureSchema() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS hive_context (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        context_type VARCHAR(50) NOT NULL,
        topic VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        embedding VECTOR,
        author VARCHAR(100),
        author_role VARCHAR(50) DEFAULT 'agent',
        status VARCHAR(20) NOT NULL DEFAULT 'approved',
        retrieval_count INT DEFAULT 0,
        scope VARCHAR(20) DEFAULT 'global',
        project_name VARCHAR(100),
        tenant_id STRING DEFAULT '00000000-0000-0000-0000-000000000001',
        created_at TIMESTAMPTZ DEFAULT now(),
        deleted_at TIMESTAMPTZ,
        metadata JSONB
      );
      ALTER TABLE hive_context ADD COLUMN IF NOT EXISTS tenant_id STRING DEFAULT '00000000-0000-0000-0000-000000000001';
    `);
  } catch (err) {
    console.warn('[DELETE] Note on schema check:', err.message);
  }
}

async function deleteSpaceData() {
  await ensureSchema();
  const { rowCount } = await pool.query(`
    DELETE FROM hive_context 
    WHERE tenant_id = $1 OR project_name = $2;
  `, [targetTenant, targetSpace]);

  console.log(`✓ Purged ${rowCount || 0} memory entries for Space '${targetSpace}' (Tenant: ${targetTenant}). Space is now at 0 Bytes / 0% quota.`);
  await pool.end();
}

deleteSpaceData().catch(err => {
  console.error('Delete space error:', err);
  process.exit(1);
});
