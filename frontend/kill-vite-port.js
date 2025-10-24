// frontend/kill-vite-port.js (ESM)
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const fs = require('fs');
const { execSync } = require('child_process');

const viteConfigPath = './vite.config.ts';
let port = 5173;

if (fs.existsSync(viteConfigPath)) {
  const content = fs.readFileSync(viteConfigPath, 'utf8');
  const match = content.match(/port\s*:\s*(\d{4,5})/);
  if (match) port = parseInt(match[1]);
}

try {
  const output = execSync(`netstat -ano | findstr :${port}`).toString();
  const pid = output.trim().split(/\s+/).pop();
  console.log(`Killing process on port ${port} (PID ${pid})...`);
  execSync(`taskkill /PID ${pid} /F`);
} catch {
  console.log(`Port ${port} is free.`);
}

