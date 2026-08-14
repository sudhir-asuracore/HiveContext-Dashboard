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
let durationSeconds = 10;
let minDelayMs = 500;
let maxDelayMs = 2500;

args.forEach(arg => {
  if (arg.startsWith('--space=')) targetSpace = arg.split('=')[1];
  if (arg.startsWith('--duration=')) durationSeconds = parseInt(arg.split('=')[1]);
  if (arg.startsWith('--time=')) durationSeconds = parseInt(arg.split('=')[1]);
  if (arg.startsWith('--min-delay=')) minDelayMs = parseInt(arg.split('=')[1]);
  if (arg.startsWith('--max-delay=')) maxDelayMs = parseInt(arg.split('=')[1]);
});

console.log(`====================================================================`);
console.log(`[SIMULATOR] Starting AI Agent MCP Simulation Loop`);
console.log(` - Target Space     : '${targetSpace}'`);
console.log(` - Total Duration   : ${durationSeconds} seconds`);
console.log(` - Delay Range      : ${minDelayMs}ms - ${maxDelayMs}ms (randomized)`);
console.log(`====================================================================\n`);

const rawUrl = process.env.DATABASE_URL || '';
const connectionString = rawUrl
  .replace('&sslrootcert=system', '')
  .replace('?sslrootcert=system&', '?')
  .replace('sslmode=verify-full', 'sslmode=require');

const pool = new Pool({ connectionString });

const sampleQueries = [
  'CockroachDB Vector Indexing',
  'AWS Amplify Serverless Pathing',
  'FastMCP Stateless HTTP',
  'Multi-Tenant Scoping Protocol',
  'Vanilla CSS HSL Theme'
];

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

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
    console.warn('[SIMULATOR] Note on schema check:', err.message);
  }
}

async function runSimulationLoop() {
  await ensureSchema();
  const endTime = Date.now() + (durationSeconds * 1000);
  let iteration = 0;

  while (Date.now() < endTime) {
    iteration++;
    const queryTopic = sampleQueries[Math.floor(Math.random() * sampleQueries.length)];
    const queryEmbed = '[' + Array(3072).fill(() => (Math.random() * 0.02).toFixed(4)).map(f => typeof f === 'function' ? f() : f).join(',') + ']';
    
    const startTime = Date.now();
    
    try {
      const { rows } = await pool.query(`
        SELECT id, topic, content, status, retrieval_count, scope, project_name,
               (embedding <=> $1::vector) as distance
        FROM hive_context
        WHERE (project_name = $2 OR scope = 'global' OR $2 = 'hive_tenant_defaultdb')
          AND status = 'approved'
        ORDER BY distance ASC
        LIMIT 3;
      `, [queryEmbed, targetSpace]);

      const latency = Date.now() - startTime;
      const timestamp = new Date().toLocaleTimeString();

      console.log(`[${timestamp}] Request #${iteration} | Space: '${targetSpace}' | Query: "${queryTopic}" | Latency: ${latency}ms`);
      
      if (rows.length > 0) {
        const topHit = rows[0];
        console.log(`  └─ Top Match: "${topHit.topic}" (ID: ${topHit.id.slice(0, 8)}...) | Distance: ${parseFloat(topHit.distance).toFixed(4)}`);
        
        // Increment retrieval count to simulate live RAG hits
        await pool.query('UPDATE hive_context SET retrieval_count = retrieval_count + 1 WHERE id = $1', [topHit.id]);
      } else {
        console.log(`  └─ No approved memories matched for space '${targetSpace}'.`);
      }

    } catch (err) {
      console.error(`  └─ Query execution error:`, err.message);
    }

    const remainingMs = endTime - Date.now();
    if (remainingMs <= 0) break;

    const randomDelay = Math.floor(Math.random() * (maxDelayMs - minDelayMs + 1)) + minDelayMs;
    const actualWait = Math.min(randomDelay, remainingMs);
    
    console.log(`  └─ Waiting ${(actualWait / 1000).toFixed(2)}s before next agent invocation...\n`);
    await sleep(actualWait);
  }

  console.log(`\n====================================================================`);
  console.log(`[SIMULATOR] Simulation Complete! Total Invocations: ${iteration}`);
  console.log(`====================================================================`);

  await pool.end();
}

runSimulationLoop().catch(err => {
  console.error('Simulation loop error:', err);
  process.exit(1);
});
