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
    const databaseName = body.database_name;

    if (!databaseName) {
      return NextResponse.json({ error: 'Missing database name' }, { status: 400 });
    }

    const cleanDbName = databaseName.replace(/[^a-zA-Z0-9_]/g, '');

    if (cleanDbName === 'hive_tenant_defaultdb') {
      await pool.query('DELETE FROM hive_context WHERE tenant_id = $1;', [tenantId]);
      return NextResponse.json({
        success: true,
        message: 'Purged tenant memories from Shared space cluster.'
      });
    }

    // Purge dedicated space table
    try {
      await pool.query(`DELETE FROM ${cleanDbName}.public.hive_context;`);
    } catch {
      await pool.query('DELETE FROM hive_context WHERE project_name = $1;', [cleanDbName]);
    }

    return NextResponse.json({
      success: true,
      message: `All memories purged from space ${cleanDbName}.`
    });
  } catch (error) {
    console.error('Failed to purge space:', error);
    return NextResponse.json({ error: 'Failed to purge space' }, { status: 500 });
  }
}
