# HiveContext Dashboard

The central control panel for **HiveContext**, an organization-level collective memory and governance system powered by **CockroachDB pgvector** and **AWS Lambda FastMCP**.

The dashboard provides engineering teams with human-in-the-loop oversight over AI agent memories, real-time token economics, multi-tenant memory spaces, and system health.

---

## 🖥️ Dashboard Overview & Key Features

![HiveContext Dashboard Preview](docs/images/dashboard-preview.png)

The control panel provides a mission-control interface for managing the collective intelligence shared across your AI agent team:

### 1. **Header & Space Isolation Selector**
- **Memory Space Switcher** *(Top Right)*: Switch seamlessly between isolated tenant database clusters (`hive_tenant_defaultdb`, dedicated multi-region clusters) or select `All Memory Spaces` for a consolidated view.
- **MCP Server Health Indicator**: Real-time probe of backend FastMCP connectivity and latency in milliseconds (e.g. `MCP: ONLINE (81ms)`).

### 2. **Telemetry & Economics Overview**
- **Active Rules vs. Pending Queue**: Tracks approved production memory entries versus proposed items awaiting review.
- **Token Savings Counter (`TOKENS SAVED (EST)`)**: Computes approximate token savings achieved by replacing long conversational discovery loops with direct, single-turn RAG retrieval.
- **Retrieval Volume (`RETRIEVAL VOLUME`)**: Real-time hit counter recording how many times AI coding agents have retrieved context from CockroachDB across developer sessions.

### 3. **Memory Management & Governance Table**
- **Context Classification Tags**: Color-coded badges distinguishing between `CONVENTION` (blue), `POST MORTEM` (red), `ADR` (amber), and `INFRA` (purple).
- **Scope Scoping Labels**: Displays `GLOBAL` (organization-wide) or `PROJ: <name>` (repo/project-specific isolation).
- **Interactive Search & Scope Filter**: Filter memories by scope (`All Scopes`, `Global`, `Project-Specific`) or paginate through high-volume banks.
- **Inline Memory Actions**:
  - **Status Toggle (`ON / OFF`)**: Instantly enable or disable a rule from agent RAG retrieval without deleting historical records.
  - **Memory Inspection & Edit Modal**: Click any topic or rule snippet to inspect full traceback details, modify content, or reclassify scope.
  - **Delete Action (`DEL`)**: Soft-delete records to retain audit trails while immediately removing them from active agent retrieval.

### 4. **Side Navigation & Admin Modules**
- **Dashboard (`/console/dashboard`)**: Live memory ledger, pending review queue, and retrieval volume telemetry.
- **Analytics (`/console/analytics`)**: Detailed memory recall metrics, agent activity timelines, and token efficiency charts.
- **Trash & Soft Deletions (`/console/trash`)**: Recover deleted memories or audit soft-deleted items before automated 30-day purge crons.
- **Settings & Control Plane (`/console/admin`)**:
  - Provision dedicated multi-region CockroachDB database clusters.
  - Generate instant MCP Client JSON configuration snippets for Antigravity, Claude, and Cursor.
  - Export and import team memory rules in JSON format.
  - Danger Zone: Execute tenant-isolated memory purges.

---

## Prerequisites
- Node.js 18+ 
- A CockroachDB cluster (Serverless or Dedicated) with pgvector extension support (v24.1+)
- Google Gemini API Key (or OpenAI/Bedrock API keys if configured)
- AWS Account (for deploying the backend FastMCP Server)

## 1. Setup CockroachDB Cluster

1. Create a free or dedicated cluster on [CockroachDB Cloud](https://cockroachlabs.cloud/).
2. Grab your connection string and ensure it includes `sslmode=verify-full`.
3. Save the connection string for configuring both the Dashboard and the Server.

## 2. Configure Environment Variables

Create a `.env.local` file in the root of the `HiveContext-Dashboard` directory:

```env
# CockroachDB connection string (with your user and password)
DATABASE_URL="postgresql://user:password@host:26257/defaultdb?sslmode=verify-full"

# Single deploy-time console owner credentials (PBKDF2 SHA-256)
ADMIN_USERNAME="admin"
ADMIN_PASSWORD_HASH="<generated_hash_here>"
SESSION_SECRET="<generate_a_random_32_char_secret>"
SESSION_TTL_SECONDS="28800"

# Google OAuth 2.0 & Admin Access Control
AUTH_SECRET="<generate_a_random_32_char_secret>"
AUTH_GOOGLE_ID="<your_google_client_id>.apps.googleusercontent.com"
AUTH_GOOGLE_SECRET="<your_google_client_secret>"
ADMIN_EMAILS="admin@yourcompany.com,devops-lead@yourcompany.com"

# Public endpoint for the canonical FastMCP service (deployed in HiveContext-MCP)
NEXT_PUBLIC_MCP_SERVER_URL="https://your-lambda-url.lambda-url.region.on.aws"
MCP_SERVER_URL="https://your-lambda-url.lambda-url.region.on.aws"
HIVE_CONTEXT_SERVER_TOKEN="hive_sk_your_bearer_token"
```

To generate the `ADMIN_PASSWORD_HASH`, run the helper script:
```bash
node scripts/generate-admin-password-hash.mjs "your_secure_password"
```

---

## 3. Google OAuth 2.0 Setup Guide

HiveContext Dashboard supports Google Single Sign-On (SSO) with **Admin Whitelist Access Control** (`ADMIN_EMAILS`).

### Step 1: Create OAuth Credentials in Google Cloud Console
1. Navigate to the [Google Cloud Console](https://console.cloud.google.com/) > **APIs & Services** > **Credentials**.
2. Click **Create Credentials** > **OAuth client ID**.
3. Set **Application type** to **Web application**.
4. Configure **Authorized JavaScript origins**:
   - Local: `http://localhost:3000`
   - Production / Amplify: `https://your-domain.amplifyapp.com`
5. Configure **Authorized redirect URIs**:
   - Local: `http://localhost:3000/api/auth/callback/google`
   - Production / Amplify: `https://your-domain.amplifyapp.com/api/auth/callback/google`
6. Copy the generated **Client ID** (`AUTH_GOOGLE_ID`) and **Client Secret** (`AUTH_GOOGLE_SECRET`).

### Step 2: Configure Admin Whitelist (`ADMIN_EMAILS`)
- The `ADMIN_EMAILS` environment variable contains a comma-separated list of authorized email addresses.
- During Google sign-in, Auth.js validates incoming accounts against this list. Users outside the whitelist are rejected and returned to `/login`.

---

## 4. Database Migration

The Dashboard will automatically provision the necessary tracking tables (spaces, api keys, tenant usage) via its internal libraries. 
Make sure you run the schema migration in the **HiveContext-MCP** repository to create the core `hive_context` tables first.

## 5. Run the Dashboard locally

Install dependencies and start the development server:
```bash
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

## 6. Deploy to AWS Amplify (Optional)

To host the Dashboard globally, you can use our automated deployment script which creates an Amplify app connected to your GitHub repository, and automatically syncs your `.env.local` to the cloud.

1. Ensure your local `.env.local` is fully configured.
2. Push your repository to GitHub.
3. Obtain a GitHub Personal Access Token (with repo access).
4. Run the automated sync script:
   ```bash
   GITHUB_TOKEN="your_pat_here" npm run amplify:sync
   ```

*Note: Once created, any future pushes to GitHub will trigger an automatic build on AWS Amplify. You can also run `npm run amplify:sync` at any time without the token to push local environment variable updates to the cloud.*
