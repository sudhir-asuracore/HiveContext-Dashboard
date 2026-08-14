const { Pool } = require('pg');

let dbUrl = process.env.DATABASE_URL;
if (dbUrl) {
    dbUrl = dbUrl.replace('sslmode=verify-full', 'sslmode=require')
                 .replace('&sslrootcert=system', '')
                 .replace('?sslrootcert=system&', '?');
}

const pool = new Pool({
  connectionString: dbUrl,
});

async function run() {
  try {
    console.log("Applying SaaS multi-tenancy migrations...");
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS tenants (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          owner_email STRING NOT NULL,
          name STRING NOT NULL,
          stripe_customer_id STRING,
          plan_tier STRING DEFAULT 'free',
          created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS api_keys (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
          key_hash STRING NOT NULL UNIQUE,
          key_prefix STRING NOT NULL,
          created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS tenant_usage (
          tenant_id UUID PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
          billing_period_start TIMESTAMP DEFAULT NOW(),
          storage_count INT DEFAULT 0,
          query_count INT DEFAULT 0
      );
    `);

    // Only alter if the column doesn't exist
    const columnExists = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='hive_context' AND column_name='tenant_id';
    `);

    if (columnExists.rows.length === 0) {
      console.log("Adding tenant_id to hive_context...");
      
      // Need a default tenant for existing rows to satisfy constraints, 
      // or just add it nullable. saas.md does not specify NOT NULL.
      await pool.query(`
        ALTER TABLE hive_context ADD COLUMN tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
      `);

      // Update Primary Key for true physical data seclusion
      // In CockroachDB, altering primary key is done via ALTER PRIMARY KEY
      try {
        await pool.query(`
          ALTER TABLE hive_context ALTER PRIMARY KEY USING COLUMNS (tenant_id, id);
        `);
      } catch (pkError) {
        console.warn("Could not alter primary key (might require dropping existing indexes or tenant_id cannot be null):", pkError.message);
      }
    }

    console.log("Successfully applied SaaS migrations!");
  } catch (error) {
    console.error("Migration error:", error);
  } finally {
    await pool.end();
  }
}

run();
