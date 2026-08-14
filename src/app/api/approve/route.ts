import { NextResponse } from 'next/server';
import { getTablesToQuery } from '@/lib/db';
import pool from '@/lib/db';

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, status } = body;
    
    if (!id || !status) {
      return NextResponse.json({ error: 'Missing id or status' }, { status: 400 });
    }

    const tables = await getTablesToQuery('all');
    let updated = false;

    for (const table of tables) {
      const { rowCount } = await pool.query(
        `UPDATE ${table} SET status = $1 WHERE id = $2`,
        [status, id]
      );
      if (rowCount && rowCount > 0) {
        updated = true;
      }
    }

    if (!updated) {
      return NextResponse.json({ error: 'Record not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating status:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
