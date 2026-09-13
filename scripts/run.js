#!/usr/bin/env node
/**
 * Test runner entry point used by every `npm run test*` script.
 *
 * It accepts a few friendly flags, turns them into environment variables /
 * CodeceptJS options and then starts `codeceptjs run --steps`:
 *
 *   npm test -- --tags "@NewSubmission"          -> codeceptjs run --steps --grep "@NewSubmission"
 *   npm test -- --tags @smoke --tags @regression -> --grep "@smoke|@regression"
 *   npm test -- --headed                         -> HEADLESS=false (browser window is shown)
 *   npm test -- --headless                       -> HEADLESS=true
 *   npm test -- --env uat2 --browser firefox     -> ENV=uat2 BROWSER=firefox
 *   npm test -- --workers 3                      -> codeceptjs run-workers 3 (parallel)
 *
 * Anything else (--grep, --debug, --verbose, a test file...) is passed straight to CodeceptJS.
 * Environment variables set in the shell keep working, e.g. in PowerShell:
 *   $env:HEADLESS="false"; npm test -- --tags "@NewSubmission"
 */
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const codeceptBin = path.join(projectRoot, 'node_modules', 'codeceptjs', 'bin', 'codecept.js');

const env = { ...process.env };
const passThrough = [];
const tags = [];
let workers = 0;

const args = process.argv.slice(2);
for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  const next = () => {
    const value = args[i + 1];
    if (value === undefined) throw new Error(`Missing value after ${arg}`);
    i++;
    return value;
  };

  if (arg === '--tags' || arg === '--tag' || arg === '-t') tags.push(next());
  else if (arg.startsWith('--tags=')) tags.push(arg.slice('--tags='.length));
  else if (arg === '--headed' || arg === '--show') env.HEADLESS = 'false';
  else if (arg === '--headless') env.HEADLESS = 'true';
  else if (arg === '--env') env.ENV = next();
  else if (arg.startsWith('--env=')) env.ENV = arg.slice('--env='.length);
  else if (arg === '--browser') env.BROWSER = next();
  else if (arg.startsWith('--browser=')) env.BROWSER = arg.slice('--browser='.length);
  else if (arg === '--workers') workers = Number(next());
  else passThrough.push(arg);
}

const codeceptArgs = workers > 0 ? ['run-workers', String(workers)] : ['run', '--steps'];
if (tags.length) codeceptArgs.push('--grep', tags.map((t) => t.trim()).join('|'));
codeceptArgs.push(...passThrough);

const headless = !/^(false|0|no|n)$/i.test(String(env.HEADLESS ?? 'true').trim());
console.log(
  `\nPolicyCenter tests  |  ENV=${env.ENV || 'uat1'}  BROWSER=${env.BROWSER || 'chrome'}  HEADLESS=${headless} (${headless ? 'browser hidden' : 'browser window visible'})`,
);
console.log(`> codeceptjs ${codeceptArgs.join(' ')}\n`);

const child = spawn(process.execPath, [codeceptBin, ...codeceptArgs], { cwd: projectRoot, env, stdio: 'inherit' });
child.on('exit', (code, signal) => process.exit(signal ? 1 : code ?? 1));
