# HiveContext Dashboard

The central control panel for **HiveContext**, a multi-tenant Agentic Memory system powered by CockroachDB. This dashboard allows you to manage AI context spaces, monitor system health, and approve memory items.

## Prerequisites
- Node.js 18+ 
- A CockroachDB cluster (Serverless or Dedicated) with pgvector extension support (v24.1+)
- Google Gemini API Key (or OpenAI/Bedrock API keys if configured)
- AWS Account (for deploying the backend MCP Server)

## 1. Setup CockroachDB Cluster

1. Create a free or dedicated cluster on [CockroachDB Cloud](https://cockroachlabs.cloud/).
2. Grab your connection string and ensure it includes `sslmode=verify-full`.
3. Save the connection string for configuring both the Dashboard and the Server.

## 2. Configure Environment Variables

Create a `.env.local` file in the root of the `HiveContext-Dashboard` directory:

```env
# CockroachDB connection string (with your user and password)
DATABASE_URL="postgresql://user:password@host:26257/defaultdb?sslmode=verify-full"

# Single deploy-time console owner password. Use the provided script to generate the hash.
ADMIN_USERNAME="admin"
ADMIN_PASSWORD_HASH="<generated_hash_here>"
SESSION_SECRET="<generate_a_random_32_char_secret>"
SESSION_TTL_SECONDS="28800"

# Public endpoint for the canonical FastMCP service (deployed in HiveContext-Server)
NEXT_PUBLIC_MCP_SERVER_URL="https://your-lambda-url.lambda-url.region.on.aws"
```

To generate the `ADMIN_PASSWORD_HASH`, run the helper script:
```bash
node scripts/generate-admin-password-hash.mjs "your_secure_password"
```

## 3. Database Migration

The Dashboard will automatically provision the necessary tracking tables (spaces, api keys, tenant usage) via its internal libraries. 
Make sure you run the schema migration in the **HiveContext-Server** repository to create the core `hive_context` tables first.

## 4. Run the Dashboard locally

Install dependencies and start the development server:
```bash
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

## 5. Deploy to AWS Amplify (Optional)

To host the Dashboard globally, you can use our automated deployment script which creates an Amplify app connected to your GitHub repository, and automatically syncs your `.env.local` to the cloud.

1. Ensure your local `.env.local` is fully configured.
2. Push your repository to GitHub.
3. Obtain a GitHub Personal Access Token (with repo access).
4. Run the automated sync script:
   ```bash
   GITHUB_TOKEN="your_pat_here" npm run amplify:sync
   ```

*Note: Once created, any future pushes to GitHub will trigger an automatic build on AWS Amplify. You can also run `npm run amplify:sync` at any time without the token to push local environment variable updates to the cloud.*
