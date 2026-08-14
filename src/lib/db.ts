import { Pool } from 'pg';

const rawUrl = process.env.DATABASE_URL || '';
const connectionString = rawUrl
  .replace('&sslrootcert=system', '')
  .replace('?sslrootcert=system&', '?')
  .replace('sslmode=verify-full', 'sslmode=require');

declare global {
  var _pgPool: Pool | undefined;
}

const pool = global._pgPool || new Pool({ connectionString });

if (process.env.NODE_ENV !== 'production') {
  global._pgPool = pool;
}

export default pool;

export async function getTablesToQuery(space: string | null): Promise<string[]> {
  let tablesToQuery: string[] = [];

  if (space && space !== 'all') {
    if (space === 'hive_tenant_defaultdb') {
      tablesToQuery = ['hive_context'];
    } else if (/^[a-zA-Z0-9_]+$/.test(space)) {
      tablesToQuery = [`${space}.public.hive_context`];
    } else {
      throw new Error('Invalid space parameter');
    }
  } else {
    tablesToQuery = ['hive_context'];
    try {
      const { rows: spaces } = await pool.query("SELECT database_name FROM hive_tenant_spaces WHERE status LIKE 'PROVISIONED%'");
      spaces.forEach((s: any) => {
        if (s.database_name && /^[a-zA-Z0-9_]+$/.test(s.database_name) && s.database_name !== 'hive_tenant_defaultdb') {
          tablesToQuery.push(`${s.database_name}.public.hive_context`);
        }
      });
    } catch (e) {
      console.error('Failed to fetch spaces for UNION', e);
    }
  }
  return tablesToQuery;
}
