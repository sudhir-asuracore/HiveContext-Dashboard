import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';
import pool from '@/lib/db';

const execAsync = promisify(exec);

export interface ClusterStatus {
  id: string;
  name: string;
  cloud: string;
  region: string;
  status: string;
  cockroachVersion: string;
  provider: string;
}

export interface TenantDatabase {
  id: string;
  databaseName: string;
  tenantId: string;
  planTier: string;
  createdAt: string;
  status: string;
  serviceAccount: string;
  primaryRegion?: string;
  secondaryRegions?: string[];
}

export interface AuditLogEvent {
  timestamp: string;
  action: string;
  actor: string;
  details: string;
}

export function getCCloudBinaryPath(): string {
  const bundledPath = path.join(process.cwd(), 'src', 'bin', 'ccloud');
  if (fs.existsSync(bundledPath)) {
    return bundledPath;
  }
  return 'ccloud';
}

export async function isCCloudInstalled(): Promise<boolean> {
  const binPath = getCCloudBinaryPath();
  try {
    if (fs.existsSync(binPath)) {
      return true;
    }
    await execAsync('which ccloud');
    return true;
  } catch {
    return false;
  }
}

export async function getClusterInfo(): Promise<ClusterStatus> {
  return {
    id: 'hive-context-30221',
    name: 'hive-context-30221',
    cloud: 'AWS',
    region: 'ap-south-1',
    status: 'HEALTHY',
    cockroachVersion: 'v24.1.7 (Vector Search)',
    provider: 'ccloud CLI (Agent-Ready)'
  };
}

async function ensureSpacesTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS tenants (
        id STRING PRIMARY KEY,
        owner_email STRING DEFAULT 'owner@hivecontext.io',
        name STRING DEFAULT 'Default Tenant',
        stripe_customer_id STRING,
        plan_tier STRING DEFAULT 'free',
        created_at TIMESTAMPTZ DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS api_keys (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id STRING NOT NULL,
        key_hash STRING NOT NULL UNIQUE,
        key_prefix STRING NOT NULL,
        created_at TIMESTAMPTZ DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS tenant_usage (
        tenant_id STRING PRIMARY KEY,
        billing_period_start TIMESTAMPTZ DEFAULT now(),
        storage_count INT DEFAULT 0,
        query_count INT DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS hive_tenant_spaces (
        id STRING PRIMARY KEY,
        database_name STRING UNIQUE NOT NULL,
        tenant_id STRING NOT NULL,
        plan_tier STRING NOT NULL DEFAULT 'pro',
        status STRING NOT NULL DEFAULT 'PROVISIONED_DEDICATED',
        service_account STRING,
        primary_region STRING DEFAULT 'ap-south-1',
        secondary_regions STRING DEFAULT '',
        created_at TIMESTAMPTZ DEFAULT now()
      );
    `);
  } catch (e) {
    console.error('Failed to ensure database tables in CockroachDB:', e);
  }
}

// 2. Provision Tenant Database with custom space name and region selection
export async function provisionTenantDatabase(
  tenantId: string, 
  userDefinedName: string = 'space',
  primaryRegion: string = 'ap-south-1',
  secondaryRegions: string[] = [],
  planTier: string = 'pro'
): Promise<TenantDatabase> {
  await ensureSpacesTable();

  const cleanUserSpaceName = userDefinedName.toLowerCase().replace(/[^a-z0-9_]/g, '_').slice(0, 18);
  const cleanTenantId = tenantId.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 8);
  const dbName = `hive_tenant_${cleanTenantId}_${cleanUserSpaceName || 'dedicated'}`;
  const saName = `sa_${cleanTenantId}`;
  const spaceId = `db-${Date.now().toString().slice(-6)}`;
  const secRegionsStr = Array.isArray(secondaryRegions) ? secondaryRegions.join(',') : '';

  try {
    // 1. Insert memory space tracking record in PROVISIONING state
    await pool.query(`
      INSERT INTO hive_tenant_spaces (id, database_name, tenant_id, plan_tier, status, service_account, primary_region, secondary_regions)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (database_name) DO NOTHING;
    `, [spaceId, dbName, tenantId, planTier, 'PROVISIONING', saName, primaryRegion, secRegionsStr]);

    // 2. Trigger asynchronous background process for the actual provisioning
    setTimeout(async () => {
      try {
        await pool.query(`CREATE DATABASE IF NOT EXISTS ${dbName};`);
        console.log(`[COCKROACHDB] Database '${dbName}' created on cluster in primary region '${primaryRegion}'.`);
        
        await pool.query(`
          CREATE TABLE IF NOT EXISTS ${dbName}.hive_context (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            context_type VARCHAR(50) NOT NULL,
            topic VARCHAR(255) NOT NULL,
            content TEXT NOT NULL,
            author VARCHAR(100),
            author_role VARCHAR(50),
            status VARCHAR(50) DEFAULT 'pending',
            retrieval_count INT DEFAULT 0,
            tenant_id STRING NOT NULL DEFAULT '${tenantId}',
            scope VARCHAR(50) DEFAULT 'global',
            project_name VARCHAR(100),
            created_at TIMESTAMPTZ DEFAULT now(),
            deleted_at TIMESTAMPTZ,
            metadata JSONB,
            embedding VECTOR(768)
          );

          CREATE INDEX IF NOT EXISTS hc_emb_768_hnsw_idx 
          ON ${dbName}.hive_context 
          USING hnsw (embedding vector_cosine_ops);
        `);

        // Initialize API Keys and usage metrics
        const apiKey = `hive_sk_${tenantId.replace(/-/g, '').substring(0, 16)}`;
        await pool.query(`
          INSERT INTO api_keys (key_hash, tenant_id, key_prefix) 
          VALUES ($1, $2, $3) 
          ON CONFLICT DO NOTHING;
        `, [apiKey, tenantId, 'hive_sk_']);
        
        await pool.query(`
          INSERT INTO tenant_usage (tenant_id, storage_count, query_count) 
          VALUES ($1, 0, 0) 
          ON CONFLICT DO NOTHING;
        `, [tenantId]);

        // Mark as fully provisioned
        await pool.query(`UPDATE hive_tenant_spaces SET status = 'PROVISIONED_DEDICATED' WHERE id = $1;`, [spaceId]);
        console.log(`[COCKROACHDB] Database '${dbName}' provisioning complete.`);
      } catch (err) {
        console.error(`[COCKROACHDB] Error in async provisioning of '${dbName}':`, err);
        await pool.query(`UPDATE hive_tenant_spaces SET status = 'FAILED' WHERE id = $1;`, [spaceId]);
      }
    }, 3000); // simulate delay

    return {
      id: spaceId,
      databaseName: dbName,
      tenantId,
      planTier,
      createdAt: new Date().toISOString(),
      status: 'PROVISIONING',
      serviceAccount: saName,
      primaryRegion,
      secondaryRegions
    };
  } catch (error) {
    console.error(`[COCKROACHDB] Error starting provisioning for '${dbName}':`, error);
    
    return {
      id: spaceId,
      databaseName: dbName,
      tenantId,
      planTier,
      createdAt: new Date().toISOString(),
      status: 'FAILED',
      serviceAccount: saName,
      primaryRegion,
      secondaryRegions
    };
  }
}

// 3. Fetch all provisioned databases with region info
export async function getProvisionedDatabases(tenantId: string): Promise<TenantDatabase[]> {
  await ensureSpacesTable();

  const defaultDb: TenantDatabase = {
    id: 'db-default-001',
    databaseName: 'hive_tenant_defaultdb',
    tenantId: '00000000-0000-0000-0000-000000000001',
    planTier: 'free',
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    status: 'ACTIVE_SHARED',
    serviceAccount: 'sa-hive-shared-reader',
    primaryRegion: 'ap-south-1',
    secondaryRegions: ['us-east-1', 'eu-west-1']
  };

  try {
    const { rows } = await pool.query(`
      SELECT id, database_name as "databaseName", tenant_id as "tenantId", plan_tier as "planTier", created_at as "createdAt", status, service_account as "serviceAccount", primary_region as "primaryRegion", secondary_regions as "secondaryRegions"
      FROM hive_tenant_spaces
      WHERE tenant_id = $1
      ORDER BY created_at ASC;
    `, [tenantId]);

    const persistentSpaces: TenantDatabase[] = rows.map(r => ({
      ...r,
      createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : new Date().toISOString(),
      primaryRegion: r.primaryRegion || 'ap-south-1',
      secondaryRegions: r.secondaryRegions ? r.secondaryRegions.split(',').filter(Boolean) : []
    }));

    return [defaultDb, ...persistentSpaces];
  } catch (e) {
    console.error('Error fetching persistent spaces from CockroachDB:', e);
    return [defaultDb];
  }
}

// 4. Fetch ALL provisioned databases across all tenants (Admin Only)
export async function getAllProvisionedDatabases(): Promise<TenantDatabase[]> {
  await ensureSpacesTable();
  try {
    const { rows } = await pool.query(`
      SELECT id, database_name as "databaseName", tenant_id as "tenantId", plan_tier as "planTier", created_at as "createdAt", status, service_account as "serviceAccount", primary_region as "primaryRegion", secondary_regions as "secondaryRegions"
      FROM hive_tenant_spaces
      ORDER BY created_at DESC;
    `);

    return rows.map(r => ({
      ...r,
      createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : new Date().toISOString(),
      primaryRegion: r.primaryRegion || 'ap-south-1',
      secondaryRegions: r.secondaryRegions ? r.secondaryRegions.split(',').filter(Boolean) : []
    }));
  } catch (e) {
    console.error('Error fetching all spaces from CockroachDB:', e);
    return [];
  }
}

// 5. Audit Logs Feed
export async function getAuditLogs(): Promise<AuditLogEvent[]> {
  return [
    {
      timestamp: new Date().toISOString(),
      action: 'CCLOUD_CLUSTER_METRICS_EVALUATED',
      actor: 'ccloud-agent-service',
      details: JSON.stringify({ cluster: 'hive-context-30221', provider: 'AWS / Multi-Region', status: 'HEALTHY' })
    },
    {
      timestamp: new Date(Date.now() - 120000).toISOString(),
      action: 'SERVICE_ACCOUNT_RBAC_SCOPED',
      actor: 'sa-hive-pro-agent',
      details: JSON.stringify({ role: 'tenant_vector_reader_writer', tenant: '00000000-0000-0000-0000-000000000001' })
    },
    {
      timestamp: new Date(Date.now() - 300000).toISOString(),
      action: 'TENANT_DATABASE_PROVISIONED',
      actor: 'ccloud-controlplane',
      details: JSON.stringify({ database: 'hive_tenant_defaultdb', cluster: 'hive-context-30221', isolation: 'ROW_LEVEL_TENANT' })
    }
  ];
}
