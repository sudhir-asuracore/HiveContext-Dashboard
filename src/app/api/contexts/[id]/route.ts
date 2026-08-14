import { NextResponse } from 'next/server';
import { getTablesToQuery } from '@/lib/db';
import pool from '@/lib/db';
import { generateEmbedding } from '@/lib/embeddings';

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const tables = await getTablesToQuery('all');
    for (const table of tables) {
      await pool.query(`UPDATE ${table} SET status = 'deleted', deleted_at = CURRENT_TIMESTAMP WHERE id = $1`, [id]);
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting context:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { topic, content, status, scope, project_name } = await request.json();
    
    // If only status is being toggled
    const tables = await getTablesToQuery('all');
    if (status && !topic && !content && scope === undefined && project_name === undefined) {
       for (const table of tables) {
         await pool.query(`UPDATE ${table} SET status = $1 WHERE id = $2`, [status.toLowerCase(), id]);
       }
       return NextResponse.json({ success: true });
    }

    let embeddingStr = null;
    let embeddingModel = null;
    if (content) {
       const res = await generateEmbedding(`Topic: ${topic}\n${content}`);
       embeddingStr = `[${res.embedding.join(',')}]`;
       embeddingModel = res.model;
    }

    for (const table of tables) {
      if (embeddingStr) {
        await pool.query(
          `UPDATE ${table} SET topic = $1, content = $2, embedding = $3::vector, embedding_model = $4, scope = $5, project_name = $6 WHERE id = $7`,
          [topic, content, embeddingStr, embeddingModel, scope || 'global', project_name || null, id]
        );
      } else {
        await pool.query(
          `UPDATE ${table} SET topic = $1, content = $2, scope = $3, project_name = $4 WHERE id = $5`,
          [topic, content, scope || 'global', project_name || null, id]
        );
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating context:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
