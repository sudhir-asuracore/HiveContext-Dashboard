import { NextResponse } from 'next/server';
import { getTablesToQuery } from '@/lib/db';
import pool from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const space = searchParams.get('space');

    const tablesToQuery = await getTablesToQuery(space);

    const unionQuery = tablesToQuery.map(t => `SELECT id, context_type, topic, content, author_role, status, retrieval_count, scope, project_name, created_at::TIMESTAMPTZ, deleted_at::TIMESTAMPTZ, metadata FROM ${t}`).join(' UNION ALL ');
    
    const finalQuery = `SELECT * FROM (${unionQuery}) AS all_contexts ORDER BY created_at DESC;`;

    const { rows } = await pool.query(finalQuery);
    return NextResponse.json(rows);
  } catch (error) {
    console.error('Error fetching contexts:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
