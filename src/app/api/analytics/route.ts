import { NextResponse } from 'next/server';
import { getTablesToQuery } from '@/lib/db';
import pool from '@/lib/db';
import { auth } from '@/auth';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const space = searchParams.get('space');
    
    const tablesToQuery = await getTablesToQuery(space);

    const unionQuery = tablesToQuery.map(t => `SELECT status, retrieval_count, topic, author_role FROM ${t}`).join(' UNION ALL ');

    const { rows: totalRows } = await pool.query(
      `SELECT COUNT(*) as total FROM (${unionQuery}) as all_data`
    );

    const { rows: statusRows } = await pool.query(
      `SELECT status, COUNT(*) as count FROM (${unionQuery}) as all_data GROUP BY status`
    );

    const { rows: retrievalTotal } = await pool.query(
      `SELECT SUM(retrieval_count) as total_retrievals FROM (${unionQuery}) as all_data`
    );

    const { rows: topRetrieved } = await pool.query(
      `SELECT topic, retrieval_count, author_role 
       FROM (${unionQuery}) as all_data 
       ORDER BY retrieval_count DESC 
       LIMIT 5`
    );

    return NextResponse.json({
      totalRules: parseInt(totalRows[0]?.total || '0'),
      statusBreakdown: statusRows.reduce((acc: any, row: any) => {
        acc[row.status] = parseInt(row.count);
        return acc;
      }, {}),
      totalRetrievals: parseInt(retrievalTotal[0]?.total_retrievals || '0'),
      topRetrieved
    });
  } catch (error: any) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json({ error: error?.message || 'Internal Server Error' }, { status: 500 });
  }
}
