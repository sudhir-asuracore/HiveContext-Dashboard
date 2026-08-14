const fs = require('fs');
const { execFileSync } = require('child_process');
const path = require('path');

const APP_NAME = 'HiveContext-Dashboard';
const BRANCH_NAME = 'master'; // Branch to connect

function getEnvVars() {
  const envPath = path.join(__dirname, '..', '.env.local');
  if (!fs.existsSync(envPath)) {
    console.error('.env.local not found!');
    process.exit(1);
  }
  
  const content = fs.readFileSync(envPath, 'utf-8');
  const envMap = {};
  
  content.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      let val = match[2].trim();
      if (!key.startsWith('#')) {
        // Strip surrounding quotes if present
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        // Unescape \$ to $ 
        val = val.replaceAll('\\$', '$');
        envMap[key] = val;
      }
    }
  });
  
  return envMap;
}

function runAWSCommand(args) {
  try {
    const finalArgs = [...args, '--output', 'json'];
    const output = execFileSync('aws', finalArgs, { encoding: 'utf-8' });
    if (!output.trim()) return {};
    return JSON.parse(output);
  } catch (err) {
    if (err.stdout && err.stdout.trim()) {
      try {
        return JSON.parse(err.stdout);
      } catch (e) {
        throw new Error(err.stderr || err.message);
      }
    }
    throw new Error(err.stderr || err.message);
  }
}

function main() {
  console.log('Reading .env.local...');
  const envMap = getEnvVars();

  console.log(`Checking for existing Amplify app named "${APP_NAME}"...`);
  const listAppsOutput = runAWSCommand(['amplify', 'list-apps']);
  const app = (listAppsOutput.apps || []).find(a => a.name === APP_NAME);

  if (app) {
    console.log(`Found existing app: ${app.appId}. Updating environment variables...`);
    runAWSCommand([
      'amplify', 'update-app',
      '--app-id', app.appId,
      '--environment-variables', JSON.stringify(envMap)
    ]);
    console.log('Environment variables successfully updated!');
  } else {
    console.log('App not found. Creating a new Amplify app...');
    const githubToken = process.env.GITHUB_TOKEN;
    let githubRepo = process.env.GITHUB_REPO;
    
    if (!githubToken) {
      console.error('Error: To create a new app, you must provide the GITHUB_TOKEN environment variable.');
      process.exit(1);
    }
    if (!githubRepo) {
      // Try to guess it from git remote
      try {
        const remoteUrl = execFileSync('git', ['config', '--get', 'remote.origin.url'], { encoding: 'utf-8' }).trim();
        githubRepo = remoteUrl.replace('.git', '');
      } catch (e) {
        console.error('Error: Could not determine GitHub repo URL. Please provide GITHUB_REPO.');
        process.exit(1);
      }
    }

    console.log(`Creating Amplify App using repo: ${githubRepo}`);
    const newAppOutput = runAWSCommand([
      'amplify', 'create-app',
      '--name', APP_NAME,
      '--repository', githubRepo,
      '--oauth-token', githubToken,
      '--platform', 'WEB_COMPUTE',
      '--environment-variables', JSON.stringify(envMap)
    ]);
    
    const appId = newAppOutput.app.appId;
    console.log(`App created successfully with ID: ${appId}. Connecting branch "${BRANCH_NAME}"...`);
    
    runAWSCommand([
      'amplify', 'create-branch',
      '--app-id', appId,
      '--branch-name', BRANCH_NAME,
      '--framework', 'Next.js - SSR'
    ]);
    
    console.log(`Branch "${BRANCH_NAME}" connected. A deployment will trigger automatically on the next push.`);
  }
}

main();
