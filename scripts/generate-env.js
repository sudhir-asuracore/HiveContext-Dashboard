const fs = require('fs');
const lines = Object.entries(process.env)
  .filter(([k]) => /^(ADMIN|DATABASE|GEMINI|COCKROACH|AUTH|NEXT|SESSION|GOOGLE)_/.test(k))
  .map(([k, v]) => `${k}='${v.replace(/'/g, "\\'")}'`);
fs.writeFileSync('.env.production', lines.join('\n') + '\n');
