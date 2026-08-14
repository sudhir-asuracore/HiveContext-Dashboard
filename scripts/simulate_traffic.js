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
let durationSeconds = 15;
let minDelayMs = 500;
let maxDelayMs = 2000;

args.forEach(arg => {
  if (arg.startsWith('--space=')) targetSpace = arg.split('=')[1];
  if (arg.startsWith('--duration=')) durationSeconds = parseInt(arg.split('=')[1]);
  if (arg.startsWith('--time=')) durationSeconds = parseInt(arg.split('=')[1]);
  if (arg.startsWith('--min-delay=')) minDelayMs = parseInt(arg.split('=')[1]);
  if (arg.startsWith('--max-delay=')) maxDelayMs = parseInt(arg.split('=')[1]);
});

console.log(`====================================================================`);
console.log(`[TRAFFIC SIMULATOR] Fetching Existing Memories & Simulating Traffic`);
console.log(` - Target Space     : '${targetSpace}'`);
console.log(` - Total Duration   : ${durationSeconds} seconds`);
console.log(` - Delay Range      : ${minDelayMs}ms - ${maxDelayMs}ms`);
console.log(`====================================================================\n`);

const rawUrl = process.env.DATABASE_URL || '';
const connectionString = rawUrl
  .replace('&sslrootcert=system', '')
  .replace('?sslrootcert=system&', '?')
  .replace('sslmode=verify-full', 'sslmode=require');

const pool = new Pool({ connectionString });
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function fetchExistingMemories() {
  try {
    const { rows } = await pool.query(`
      SELECT id, topic, content, context_type, status, retrieval_count, scope, project_name, embedding
      FROM hive_context
      WHERE (project_name = $1 OR scope = 'global' OR $1 = 'hive_tenant_defaultdb')
        AND status IN ('approved', 'auto_approved')
      ORDER BY created_at DESC;
    `, [targetSpace]);
    return rows;
  } catch (err) {
    console.error('[TRAFFIC SIMULATOR] Error fetching existing memories:', err.message);
    return [];
  }
}

async function runTrafficSimulation() {
  console.log(`[TRAFFIC SIMULATOR] Connecting to CockroachDB and querying existing memories...`);
  const memories = await fetchExistingMemories();

  if (memories.length === 0) {
    console.log(`[TRAFFIC SIMULATOR] No approved existing memories found for space '${targetSpace}'.`);
    console.log(`[TRAFFIC SIMULATOR] Exiting traffic simulation.`);
    await pool.end();
    return;
  }

  console.log(`[TRAFFIC SIMULATOR] Found ${memories.length} existing memory entries.`);
  memories.forEach((m, idx) => {
    console.log(`   [${idx + 1}] (${m.context_type}) "${m.topic}" - Hits: ${m.retrieval_count}`);
  });
  console.log(`\n--------------------------------------------------------------------\n`);

  const endTime = Date.now() + (durationSeconds * 1000);
  let iteration = 0;

  while (Date.now() < endTime) {
    iteration++;
    // Pick a random existing memory entry to simulate a direct hit / RAG retrieval
    const targetMemory = memories[Math.floor(Math.random() * memories.length)];
    const startTime = Date.now();

    try {
      // Simulate real query matching the target topic
      const queryEmbed = '[' + Array(3072).fill(() => (Math.random() * 0.02).toFixed(4)).map(f => typeof f === 'function' ? f() : f).join(',') + ']';

      // Record hit on the target memory entry
      const { rows } = await pool.query(`
        UPDATE hive_context 
        SET retrieval_count = retrieval_count + 1 
        WHERE id = $1 
        RETURNING id, topic, retrieval_count;
      `, [targetMemory.id]);

      const latency = Date.now() - startTime;
      const timestamp = new Date().toLocaleTimeString();

      if (rows.length > 0) {
        const updated = rows[0];
        console.log(`[${timestamp}] Hit #${iteration} | Space: '${targetSpace}' | Memory: "${updated.topic}" | New Hits: ${updated.retrieval_count} | Latency: ${latency}ms`);
      }

    } catch (err) {
      console.error(`  └─ Simulation update error:`, err.message);
    }

    const remainingMs = endTime - Date.now();
    if (remainingMs <= 0) break;

    const randomDelay = Math.floor(Math.random() * (maxDelayMs - minDelayMs + 1)) + minDelayMs;
    const actualWait = Math.min(randomDelay, remainingMs);
    
    console.log(`  └─ Waiting ${(actualWait / 1000).toFixed(2)}s before next hit...\n`);
    await sleep(actualWait);
  }

  console.log(`\n====================================================================`);
  console.log(`[TRAFFIC SIMULATOR] Traffic Simulation Complete! Total Simulated Hits: ${iteration}`);
  console.log(`====================================================================`);

  await pool.end();
}

runTrafficSimulation().catch(err => {
  console.error('Traffic simulation error:', err);
  process.exit(1);
});
