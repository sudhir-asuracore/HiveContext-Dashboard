import { NextResponse } from 'next/server';

function serverConfig() {
  const baseUrl = process.env.MCP_SERVER_URL || process.env.NEXT_PUBLIC_MCP_SERVER_URL;
  const token = process.env.HIVE_CONTEXT_SERVER_TOKEN;
  if (!baseUrl) {
    return { baseUrl: null, token: token || null };
  }
  return { baseUrl: baseUrl.replace(/\/$/, ''), token: token || null };
}

async function serverRequest(path: string, init?: RequestInit) {
  const { baseUrl, token } = serverConfig();
  if (!baseUrl) {
    return NextResponse.json({ error: 'MCP_SERVER_URL is not configured.' }, { status: 503 });
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init?.headers as Record<string, string>),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    cache: 'no-store',
    headers,
  });
  const body = await response.json().catch(() => ({ error: 'Invalid server response.' }));
  return NextResponse.json(body, { status: response.status });
}

export async function GET() {
  const { baseUrl, token } = serverConfig();
  const startTime = Date.now();

  if (!baseUrl) {
    return NextResponse.json({
      mcpServer: {
        status: 'UNCONFIGURED',
        url: null,
        latencyMs: 0,
        error: 'MCP_SERVER_URL is not set in environment.',
      },
      cluster: { database: 'CockroachDB', version: 'v24.1+', status: 'healthy' },
      usage: { activeMemories: 0, deletedMemories: 0 },
      embedding: { provider: 'gemini', model: 'text-embedding-004', dimensions: 3072, incompatibleMemories: 0, healthy: true },
      reembedJob: null,
    });
  }

  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${baseUrl}/health`, { cache: 'no-store', headers });
    const latencyMs = Date.now() - startTime;
    const body = await res.json().catch(() => ({ status: 'unknown' }));

    if (res.ok) {
      return NextResponse.json({
        ...body,
        mcpServer: {
          status: 'ONLINE',
          url: baseUrl,
          latencyMs,
          details: body,
        },
        cluster: body.cluster || { database: 'CockroachDB', version: 'v24.1+', status: 'healthy' },
        usage: body.usage || { activeMemories: 0, deletedMemories: 0 },
        embedding: body.embedding || { provider: 'gemini', model: 'text-embedding-004', dimensions: 3072, incompatibleMemories: 0, healthy: true },
        reembedJob: body.reembedJob || null,
      });
    }

    return NextResponse.json({
      ...body,
      mcpServer: {
        status: 'DEGRADED',
        url: baseUrl,
        latencyMs,
        error: `HTTP ${res.status}: ${body.error || 'Server degraded'}`,
      },
      cluster: { database: 'CockroachDB', version: 'v24.1+', status: 'degraded' },
      usage: { activeMemories: 0, deletedMemories: 0 },
      embedding: { provider: 'gemini', model: 'text-embedding-004', dimensions: 3072, incompatibleMemories: 0, healthy: true },
      reembedJob: null,
    });
  } catch (error) {
    const latencyMs = Date.now() - startTime;
    return NextResponse.json({
      mcpServer: {
        status: 'OFFLINE',
        url: baseUrl,
        latencyMs,
        error: error instanceof Error ? error.message : 'MCP Server unreachable',
      },
      cluster: { database: 'CockroachDB', version: 'v24.1+', status: 'unreachable' },
      usage: { activeMemories: 0, deletedMemories: 0 },
      embedding: { provider: 'gemini', model: 'text-embedding-004', dimensions: 3072, incompatibleMemories: 0, healthy: false },
      reembedJob: null,
    });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (body.action === 'start') {
      return await serverRequest('/reembed', { method: 'POST', body: '{}' });
    }
    if (body.action === 'batch') {
      return await serverRequest('/reembed/batch', {
        method: 'POST',
        body: JSON.stringify({ batchSize: body.batchSize ?? 5 }),
      });
    }
    return NextResponse.json({ error: 'Unsupported health action.' }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Health action failed.' },
      { status: 503 },
    );
  }
}