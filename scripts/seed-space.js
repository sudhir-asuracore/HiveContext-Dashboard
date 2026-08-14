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
let seedCount = 3;

args.forEach(arg => {
  if (arg.startsWith('--space=')) targetSpace = arg.split('=')[1];
  if (arg.startsWith('--tenant=')) targetTenant = arg.split('=')[1];
  if (arg.startsWith('--count=')) seedCount = parseInt(arg.split('=')[1]);
});

console.log(`[SEED] Initializing seed script for target Memory Space: '${targetSpace}' (Tenant: ${targetTenant})`);

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
    console.warn('[SEED] Note on schema check:', err.message);
  }
}

async function seedSpace() {
  await ensureSchema();
  const defaultEmbed = '[' + Array(3072).fill(0.015).join(',') + ']';

  const testMemories = [
    {
      context_type: 'convention',
      topic: `CockroachDB Vector Indexing (${targetSpace})`,
      content: `Targeted memory space rule for ${targetSpace}. High-dimensional HNSW index configuration with 768d embeddings.`,
      author: 'space-architect',
      author_role: 'admin',
      status: 'approved',
      retrieval_count: 50,
      scope: 'project',
      project_name: targetSpace
    },
    {
      context_type: 'adr',
      topic: `Multi-Tenant Isolation Protocol (${targetSpace})`,
      content: `Architecture Decision Record for memory space ${targetSpace}. Scoped to tenant ${targetTenant} in CockroachDB.`,
      author: 'lead-dev',
      author_role: 'admin',
      status: 'approved',
      retrieval_count: 28,
      scope: 'project',
      project_name: targetSpace
    },
    {
      context_type: 'post_mortem',
      topic: `Automated Space Purge & Recovery (${targetSpace})`,
      content: `Post-mortem analysis of memory space ${targetSpace}. Verified that purging space ${targetSpace} leaves zero footprint while preserving quota indicators.`,
      author: 'sre-team',
      author_role: 'user',
      status: 'approved',
      retrieval_count: 14,
      scope: 'global',
      project_name: null
    }
  ];

  if (seedCount > testMemories.length) {
    const extraCount = seedCount - testMemories.length;
    for (let i = 0; i < extraCount; i++) {
      testMemories.push({
        context_type: 'adr',
        topic: `Auto-generated Memory ${i + 1} (${targetSpace})`,
        content: `This is a procedurally generated memory block ${i + 1} for ${targetSpace}.`,
        author: 'seed-bot',
        author_role: 'system',
        status: 'approved',
        retrieval_count: Math.floor(Math.random() * 100),
        scope: 'project',
        project_name: targetSpace
      });
    }
  } else if (seedCount < testMemories.length) {
    testMemories.length = seedCount;
  }

  let inserted = 0;
  for (const m of testMemories) {
    const { rowCount } = await pool.query(`
      INSERT INTO hive_context 
        (context_type, topic, content, author, author_role, status, retrieval_count, tenant_id, scope, project_name, embedding)
      VALUES 
        ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::vector)
    `, [
      m.context_type,
      m.topic,
      m.content,
      m.author,
      m.author_role,
      m.status,
      m.retrieval_count,
      targetTenant,
      m.scope,
      m.project_name,
      defaultEmbed
    ]);
    inserted += rowCount || 1;
  }

  console.log(`✓ Successfully seeded ${inserted} memories into Space '${targetSpace}' (Tenant: ${targetTenant})`);
  await pool.end();
}

seedSpace().catch(err => {
  console.error('Seed script error:', err);
  process.exit(1);
});
