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

    // Execute tenant-isolated deletion on shared space cluster
    const { rowCount } = await pool.query(
      'DELETE FROM hive_context WHERE tenant_id = $1;',
      [tenantId]
    );

    return NextResponse.json({
      success: true,
      cluster: 'Shared space cluster',
      database: 'hive_tenant_defaultdb',
      tenant_id: tenantId,
      purged_count: rowCount || 0,
      quota_bytes: 0,
      status: 'ACTIVE_SHARED_EMPTY',
      message: `Tenant-isolated purge successful. Cleared ${rowCount || 0} memories from Shared space cluster. Space remains active with 0 Bytes / 0% quota.`
    });
  } catch (error) {
    console.error('Tenant-isolated purge failed:', error);
    return NextResponse.json(
      { error: 'Failed to purge shared space cluster data for tenant' },
      { status: 500 }
    );
  }
}
