import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function POST() {
  try {
    await pool.query('DELETE FROM hive_context');
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to reset system:', error);
    return NextResponse.json({ error: 'Failed to reset system' }, { status: 500 });
  }
}
