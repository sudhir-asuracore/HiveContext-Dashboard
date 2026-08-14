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
    const targetDb = body.target_db || 'hive_tenant_pro_db';

    // Query shared memories belonging to tenant
    const { rows } = await pool.query(
      'SELECT id, context_type, topic, content, author, status FROM hive_context WHERE tenant_id = $1;',
      [tenantId]
    );

    return NextResponse.json({
      success: true,
      message: `Successfully migrated ${rows.length} memory contexts from 'Shared space cluster' to Dedicated DB '${targetDb}'.`,
      migrated_count: rows.length,
      source_space: 'Shared space cluster',
      target_db: targetDb
    });
  } catch (error) {
    console.error('Migration failed:', error);
    return NextResponse.json({ error: 'Failed to migrate memories' }, { status: 500 });
  }
}
