import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SUPPORTED_BROWSERS = ['chrome', 'firefox'];

function parseBoolean(value, defaultValue) {
  if (value === undefined || value === '') return defaultValue;
  return /^(true|1|yes|y)$/i.test(String(value).trim());
}

/**
 * Resolves the runtime environment from the command line:
 *   ENV=uat2 BROWSER=firefox HEADLESS=false npx codeceptjs run
 *
 * ENV          -> config/env/<ENV>.json   (default: uat1)
 * BROWSER      -> chrome | firefox        (default: chrome). A BROWSER pointing to an executable path
 *                 (the OS "default browser" convention) is ignored.
 * HEADLESS     -> true | false            (default: true)
 * DATA_API_URL -> overrides `dataApiUrl` from the environment file (auto-graystone-data service URL)
 */
export function loadEnvironment() {
  const name = process.env.ENV || 'uat1';
  const file = path.resolve(__dirname, 'env', `${name}.json`);

  if (!fs.existsSync(file)) {
    const available = fs
      .readdirSync(path.resolve(__dirname, 'env'))
      .filter((f) => f.endsWith('.json'))
      .map((f) => f.replace(/\.json$/, ''))
      .join(', ');
    throw new Error(`Unknown environment "${name}". Expected ${file}. Available: ${available}`);
  }

  const rawBrowser = process.env.BROWSER || '';
  const browser = (/[\\/]/.test(rawBrowser) ? '' : rawBrowser).toLowerCase() || 'chrome';
  if (!SUPPORTED_BROWSERS.includes(browser)) {
    throw new Error(`Unsupported BROWSER "${browser}". Puppeteer supports: ${SUPPORTED_BROWSERS.join(', ')}`);
  }

  const envConfig = JSON.parse(fs.readFileSync(file, 'utf8'));

  const dataApiUrl = (process.env.DATA_API_URL || envConfig.dataApiUrl || '').trim();
  if (!dataApiUrl) {
    throw new Error(`"dataApiUrl" (auto-graystone-data service URL) is missing in ${file}; set it there or via DATA_API_URL`);
  }

  return {
    ...envConfig,
    dataApiUrl,
    name,
    browser,
    headless: parseBoolean(process.env.HEADLESS, true),
  };
}

export const environment = loadEnvironment();
