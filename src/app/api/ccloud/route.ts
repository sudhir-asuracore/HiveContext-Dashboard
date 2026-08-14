import { NextRequest, NextResponse } from 'next/server';
import { getProvisionedDatabases, provisionTenantDatabase, getClusterInfo } from '@/lib/ccloud';

const DEFAULT_TENANT_ID = '00000000-0000-0000-0000-000000000001';

export async function GET() {
  try {
    const cluster = await getClusterInfo();
    const databases = await getProvisionedDatabases(DEFAULT_TENANT_ID);
    const mcpServerUrl = process.env.NEXT_PUBLIC_MCP_SERVER_URL || process.env.MCP_SERVER_URL || 'https://<your-fastmcp-lambda-url>.lambda-url.<region>.on.aws';
    const apiKey = process.env.HIVE_CONTEXT_SERVER_TOKEN || process.env.NEXT_PUBLIC_MCP_SECRET_TOKEN || process.env.MCP_SECRET_TOKEN || 'hive_sk_your_bearer_token';

    return NextResponse.json({
      success: true,
      cluster,
      databases,
      planTier: 'pro',
      tenantId: DEFAULT_TENANT_ID,
      mcpServerUrl,
      apiKey
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch provisioned database spaces' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { space_name, primary_region, secondary_regions, plan_tier } = body;

    const newDb = await provisionTenantDatabase(
      DEFAULT_TENANT_ID,
      space_name || 'space',
      primary_region || 'ap-south-1',
      secondary_regions || [],
      plan_tier || 'pro'
    );

    return NextResponse.json({
      success: true,
      message: `Provisioning database memory space '${newDb.databaseName}' initiated on CockroachDB cluster.`,
      database: newDb
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to provision dedicated database space' },
      { status: 500 }
    );
  }
}

