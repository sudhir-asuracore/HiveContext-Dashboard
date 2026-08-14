# HiveContext Dashboard Scripts

Utility scripts for seeding, testing, simulating, and purging memory space data on CockroachDB.

## Prerequisites

Ensure `DATABASE_URL` is set in `.env.local` or exported in your environment:

```bash
DATABASE_URL="postgresql://user:pass@host:26257/hive_oss_defaultdb?sslmode=verify-full"
```

---

## 1. Seed Memory Space Data

Seed test memories into a specific memory space (defaults to `hive_tenant_defaultdb`):

```bash
# Seed default space
node scripts/seed-space.js

# Seed a custom memory space
node scripts/seed-space.js --space=analytics_prod

# Seed a specific number of memories
node scripts/seed-space.js --count=100
```

---

## 2. Simulate AI Agent RAG Activity

Simulate an AI agent performing continuous vector search queries against a target space:

```bash
# Run simulator for 10 seconds against default space
node scripts/simulate-agent.js --space=hive_tenant_defaultdb --duration=10

# Custom duration (in seconds) and delay range (in ms)
node scripts/simulate-agent.js --space=analytics_prod --duration=30 --min-delay=1000 --max-delay=3000
```

---

## 3. Purge Memory Space Data

Purge all memory entries associated with a space or tenant:

```bash
# Delete entries for default space
node scripts/delete-space.js

# Delete entries for a dedicated space
node scripts/delete-space.js --space=analytics_prod
```

---

## 4. Generate Admin Password Hash

Generate a PBKDF2 hash for local authentication setup in `.env.local`:

```bash
npm run generate:admin-password-hash -- <your_password>
```
