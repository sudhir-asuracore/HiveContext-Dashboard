import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function POST(request: Request) {
  try {
    const data = await request.json();
    if (!Array.isArray(data)) {
        return NextResponse.json({ error: 'Invalid data format' }, { status: 400 });
    }

    for (const rule of data) {
       await pool.query(
          `INSERT INTO hive_context (context_type, topic, content, author, author_role, status, retrieval_count, embedding)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8::vector)`,
          [rule.context_type === 'adr' ? 'architecture_decision' : rule.context_type || 'convention', rule.topic, rule.content, rule.author || 'system', rule.author_role || 'admin', (rule.status || 'pending').toLowerCase(), rule.retrieval_count || 0, rule.embedding_text]
       );
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to import:', error);
    return NextResponse.json({ error: 'Failed to import rules' }, { status: 500 });
  }
}
