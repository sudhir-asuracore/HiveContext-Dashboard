import { NextResponse } from 'next/server';
import { getTablesToQuery } from '@/lib/db';
import pool from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const space = searchParams.get('space') === 'all' ? 'all' : searchParams.get('space');
    const tables = await getTablesToQuery(space || 'all');
    const unionQuery = tables.map(t => `SELECT context_type, topic, content, author, author_role, status, retrieval_count, embedding::text as embedding_text, '${t}' as source_table FROM ${t}`).join(' UNION ALL ');
    
    const { rows } = await pool.query(unionQuery);
    
    return new NextResponse(JSON.stringify(rows, null, 2), {
       headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': 'attachment; filename="hivecontext_backup.json"'
       }
    });
  } catch (error) {
    console.error('Failed to export:', error);
    return NextResponse.json({ error: 'Failed to export' }, { status: 500 });
  }
}
