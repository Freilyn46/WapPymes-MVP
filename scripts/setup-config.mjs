import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const envPath = path.join(rootDir, '.env');
const configPath = path.join(rootDir, 'runtime-config.js');

function parseEnv(filePath) {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  const contents = fs.readFileSync(filePath, 'utf8');
  const values = {};

  for (const line of contents.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const match = trimmed.match(/^([A-Za-z0-9_]+)\s*=\s*(.*)$/);
    if (!match) continue;

    const [, key, rawValue] = match;
    const value = rawValue.replace(/^['"]|['"]$/g, '');
    values[key] = value;
  }

  return values;
}

const envValues = {
  ...parseEnv(envPath),
  ...process.env
};

const config = {
  appBaseUrl: envValues.APP_BASE_URL || 'http://localhost:8000',
  supabaseUrl: envValues.SUPABASE_URL || '',
  supabaseAnonKey: envValues.SUPABASE_ANON_KEY || ''
};

const fileContent = `window.APP_CONFIG = ${JSON.stringify(config, null, 2)};\n`;
fs.writeFileSync(configPath, fileContent, 'utf8');
console.log(`Config generated at ${configPath}`);
