import { readFile } from 'node:fs/promises';
import { resolve, sep } from 'node:path';
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { APPLICATIONS } from './build-inputs.mjs';
const choice = process.argv[2] === 'buggy' ? 'faulty' : process.argv[2] ?? 'both';
if (!['faulty', 'fixed', 'both'].includes(choice)) throw new Error('Choose buggy, fixed or both.');
const children = [];
for (const variant of choice === 'both' ? ['faulty', 'fixed'] : [choice]) {
  const directory = resolve(APPLICATIONS[variant]);
  const manifest = JSON.parse(await readFile(resolve(directory, 'build-manifest.json'), 'utf8'));
  if (manifest.variant !== variant) throw new Error('Incorrect application variant.');
  for (const [file, expected] of Object.entries(manifest.fileSha256)) {
    const path = resolve(directory, file);
    if (!path.startsWith(directory + sep)) throw new Error('Invalid manifest path.');
    if (createHash('sha256').update(await readFile(path)).digest('hex') !== expected) throw new Error(`Application file changed: ${path}. Rebuild this application.`);
  }
  console.log(`${variant}: http://127.0.0.1:${manifest.defaultPort}/overview (${manifest.id})`);
  children.push(spawn(process.execPath, ['server/index.mjs'], { cwd: directory, stdio: 'inherit', env: { ...process.env, PORT: String(manifest.defaultPort), PAYROLL_DB: resolve(directory, 'data/payroll.sqlite') } }));
}
let stopping = false;
function stop(code = 0) { if (stopping) return; stopping = true; for (const child of children) child.kill(); process.exitCode = code; }
for (const child of children) { child.on('error', () => stop(1)); child.on('exit', code => stop(code ?? 0)); }
process.on('SIGINT', () => stop()); process.on('SIGTERM', () => stop());
