const { Pool } = require('pg');

const rawUrl = process.env.DATABASE_URL || '';
const connectionString = rawUrl
  .replace('&sslrootcert=system', '')
  .replace('?sslrootcert=system&', '?');

const pool = new Pool({ connectionString });

async function seed() {
  console.log('Seeding hive_context with rich engineering memories...');
  
  const defaultEmbed = '[' + Array(768).fill(0.01).join(',') + ']';
  
  const memories = [
    {
      context_type: 'convention',
      topic: 'CockroachDB Distributed Vector Search Indexing',
      content: 'Always use standard cosine distance operators (<=>) when querying 768-dimensional Gemini vector embeddings in CockroachDB v24.1. Set hnsw.ef_search = 64 for optimal recall vs latency tradeoffs.',
      author: 'system-architect',
      author_role: 'admin',
      status: 'approved',
      retrieval_count: 142,
      tenant_id: '00000000-0000-0000-0000-000000000001',
      scope: 'global',
      project_name: null
    },
    {
      context_type: 'post_mortem',
      topic: 'AWS Amplify Serverless Custom Binary Bundle Pathing',
      content: 'Custom CLI binaries like ccloud must be downloaded during preBuild into src/bin/ccloud. Next.js API routes on Amplify execute in isolated Lambda environments where path.join(process.cwd(), "src", "bin", "ccloud") resolves the bundled binary.',
      author: 'devops-lead',
      author_role: 'admin',
      status: 'approved',
      retrieval_count: 89,
      tenant_id: '00000000-0000-0000-0000-000000000001',
      scope: 'global',
      project_name: null
    },
    {
      context_type: 'adr',
      topic: 'FastMCP Stateless HTTP Transport for Multi-Container Resiliency',
      content: 'Architected FastMCP with streamable_http_app(stateless_http=True) on AWS Lambda to ensure stateful SSE multi-container session 400 errors are prevented across distributed agent requests.',
      author: 'backend-team',
      author_role: 'admin',
      status: 'approved',
      retrieval_count: 67,
      tenant_id: '00000000-0000-0000-0000-000000000001',
      scope: 'project',
      project_name: 'HiveContext-Server'
    },
    {
      context_type: 'convention',
      topic: 'Tenant-Isolated Multi-Tenancy Memory Scoping',
      content: 'Free users share hive_tenant_defaultdb with strict SQL row-level tenant_id filtering. Upgraded Pro/Enterprise users auto-provision dedicated CockroachDB databases via ccloud CLI.',
      author: 'security-lead',
      author_role: 'admin',
      status: 'approved',
      retrieval_count: 115,
      tenant_id: '00000000-0000-0000-0000-000000000001',
      scope: 'project',
      project_name: 'HiveContext-Dashboard'
    },
    {
      context_type: 'convention',
      topic: 'Next.js Turbopack Modern UI Styling Standards',
      content: 'All SaaS console interfaces must use Vanilla CSS and HSL dark themes with glassmorphism overlays and vibrant micro-animations. Avoid generic Tailwind defaults.',
      author: 'frontend-lead',
      author_role: 'user',
      status: 'approved',
      retrieval_count: 34,
      tenant_id: '00000000-0000-0000-0000-000000000001',
      scope: 'global',
      project_name: null
    },
    {
      context_type: 'convention',
      topic: 'Agent Autonomous Memory Auto-Approval Thresholds',
      content: 'High-confidence agent MCP proposals with similarity score < 0.1 are automatically approved into the collective memory bank. Ambiguous proposals enter pending review stage.',
      author: 'ai-agent-v2',
      author_role: 'user',
      status: 'pending',
      retrieval_count: 12,
      tenant_id: '00000000-0000-0000-0000-000000000001',
      scope: 'global',
      project_name: null
    }
  ];

  for (const m of memories) {
    await pool.query(`
      INSERT INTO hive_context 
        (context_type, topic, content, author, author_role, status, retrieval_count, tenant_id, scope, project_name, embedding)
      VALUES 
        ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::vector)
      ON CONFLICT DO NOTHING;
    `, [
      m.context_type,
      m.topic,
      m.content,
      m.author,
      m.author_role,
      m.status,
      m.retrieval_count,
      m.tenant_id,
      m.scope,
      m.project_name,
      defaultEmbed
    ]);
  }

  const { rows } = await pool.query('SELECT count(*) FROM hive_context');
  console.log(`Seeding complete. Total rows in hive_context: ${rows[0].count}`);
  await pool.end();
}

seed().catch(err => {
  console.error('Seeding error:', err);
  process.exit(1);
});
