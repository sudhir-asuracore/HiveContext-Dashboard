import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(Math.max(Number(searchParams.get('limit') || 50), 1), 100);

    const { rows } = await pool.query(
      `SELECT id, username, auth_method, status, ip_address, user_agent, error_message, created_at
       FROM auth_logs
       ORDER BY created_at DESC
       LIMIT $1`,
      [limit]
    );

    // Compute summary metrics
    const lastAttempt = rows[0] || null;
    const lastSuccess = rows.find((r: any) => r.status === 'SUCCESS') || null;

    return NextResponse.json({
      logs: rows,
      lastAttempt,
      lastSuccess,
      totalCount: rows.length,
    });
  } catch (error: any) {
    console.error('Failed to fetch auth logs:', error);
    return NextResponse.json({ error: 'Failed to fetch logs: ' + error.message }, { status: 500 });
  }
}
