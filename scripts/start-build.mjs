import { readFile } from 'node:fs/promises';
import { resolve, sep } from 'node:path';
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';

const choice = process.argv[2] ?? 'both';
if (!['faulty', 'fixed', 'both'].includes(choice)) throw new Error('Choose faulty, fixed or both.');
const pair = JSON.parse(await readFile('assessment/builds/pair.json', 'utf8'));
const children = [];
for (const variant of choice === 'both' ? ['faulty', 'fixed'] : [choice]) {
  const item = pair.builds[variant], directory = resolve(item.directory), outputRoot = resolve('output/builds') + sep;
  if (!directory.startsWith(outputRoot)) throw new Error('Build path must stay inside output/builds.');
  const manifest = JSON.parse(await readFile(resolve(directory, 'build-manifest.json'), 'utf8'));
  for (const [file, expected] of Object.entries(manifest.fileSha256)) {
    const path = resolve(directory, file); if (!path.startsWith(directory + sep)) throw new Error('Invalid manifest path.');
    if (createHash('sha256').update(await readFile(path)).digest('hex') !== expected) throw new Error(`Build file changed: ${file}. Rebuild the pair.`);
  }
  console.log(`${variant}: http://127.0.0.1:${item.port}/overview (${item.buildId})`);
  children.push(spawn(process.execPath, [resolve(directory, 'server/index.mjs')], { stdio: 'inherit', env: { ...process.env, PORT: String(item.port), PAYROLL_DB: resolve(directory, 'data/payroll.sqlite') } }));
}
let stopping = false;
function stop(code = 0) { if (stopping) return; stopping = true; for (const child of children) child.kill(); process.exitCode = code; }
for (const child of children) { child.on('error', () => stop(1)); child.on('exit', code => stop(code ?? 0)); }
process.on('SIGINT', () => stop()); process.on('SIGTERM', () => stop());
