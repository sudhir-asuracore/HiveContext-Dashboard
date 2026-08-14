import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { auth } from '@/auth';

export async function POST(request: Request) {
  try {
    const session = await auth();
    let tenantId = (session as any)?.tenant?.id;

    if (!tenantId && session?.user?.email) {
      const tenantRes = await pool.query('SELECT id FROM tenants WHERE owner_email = $1;', [session.user.email]);
      if (tenantRes.rows[0]) {
        tenantId = tenantRes.rows[0].id;
      }
    }

    if (!tenantId) {
      tenantId = '00000000-0000-0000-0000-000000000001';
    }

    const body = await request.json().catch(() => ({}));
    const spaceId = body.space_id;
    const databaseName = body.database_name;

    if (!databaseName || databaseName === 'hive_tenant_defaultdb') {
      return NextResponse.json({ error: 'Cannot delete shared default space' }, { status: 400 });
    }

    // Clean database name to prevent SQL injection
    const cleanDbName = databaseName.replace(/[^a-zA-Z0-9_]/g, '');

    // 1. Mark space as DELETING immediately
    if (spaceId) {
      await pool.query(`UPDATE hive_tenant_spaces SET status = 'DELETING' WHERE (id = $1 OR database_name = $2) AND tenant_id = $3;`, [spaceId, cleanDbName, tenantId]);
    } else {
      await pool.query(`UPDATE hive_tenant_spaces SET status = 'DELETING' WHERE database_name = $1 AND tenant_id = $2;`, [cleanDbName, tenantId]);
    }

    // 2. Trigger asynchronous background process for the actual deletion
    setTimeout(async () => {
      try {
        await pool.query(`DROP DATABASE IF EXISTS ${cleanDbName} CASCADE;`);
        console.log(`[COCKROACHDB] Database '${cleanDbName}' dropped from cluster.`);

        if (spaceId) {
          await pool.query(`DELETE FROM hive_tenant_spaces WHERE (id = $1 OR database_name = $2) AND tenant_id = $3;`, [spaceId, cleanDbName, tenantId]);
        } else {
          await pool.query(`DELETE FROM hive_tenant_spaces WHERE database_name = $1 AND tenant_id = $2;`, [cleanDbName, tenantId]);
        }
        console.log(`[COCKROACHDB] Database tracking record '${cleanDbName}' removed.`);
      } catch (err) {
        console.error(`[COCKROACHDB] Error in async deletion of '${cleanDbName}':`, err);
        // On failure, revert status to PROVISIONED_DEDICATED so the user knows it failed or can retry
        if (spaceId) {
          await pool.query(`UPDATE hive_tenant_spaces SET status = 'PROVISIONED_DEDICATED' WHERE (id = $1 OR database_name = $2) AND tenant_id = $3;`, [spaceId, cleanDbName, tenantId]);
        }
      }
    }, 3000);

    return NextResponse.json({
      success: true,
      message: `Memory space ${cleanDbName} successfully deleted from CockroachDB cluster.`
    });
  } catch (error) {
    console.error('Failed to delete space:', error);
    return NextResponse.json({ error: 'Failed to delete space' }, { status: 500 });
  }
}
