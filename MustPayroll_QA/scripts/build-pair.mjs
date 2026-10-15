import { spawn } from 'node:child_process';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { SOURCE_FILES, TEST_FILES, APPLICATIONS } from './build-inputs.mjs';
const npmCli = process.env.npm_execpath;
if (!npmCli) throw new Error('Run npm run build:pair from MustPayroll_QA.');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
await mkdir('assessment/builds', { recursive: true });
const pair = { application: 'MustPayroll', generatedAt: new Date().toISOString(), sourceSha256: {}, builds: {} };
for (const [variant, directory] of Object.entries(APPLICATIONS)) {
  const child = spawn(process.execPath, [npmCli, 'run', 'build'], { cwd: resolve(directory), stdio: 'inherit' });
  const code = await new Promise((done, reject) => { child.on('error', reject); child.on('close', done); });
  if (code !== 0) throw new Error(`Independent ${variant} build failed. Run npm ci in ${directory}.`);
  const bytes = await readFile(resolve(directory, 'build-manifest.json')), manifest = JSON.parse(bytes);
  if (manifest.variant !== variant) throw new Error('Application identity differs from requested build.');
  const manifestPath = `assessment/builds/${variant}-manifest.json`;
  await writeFile(manifestPath, bytes);
  pair.builds[variant] = { buildId: manifest.id, variant, port: manifest.defaultPort, directory,
    executionDirectory: `executions/${variant === 'faulty' ? 'buggy' : 'fixed'}`,
    sourceFingerprint: manifest.sourceFingerprint, runtimeSha256: manifest.runtimeSha256, manifest: manifestPath, manifestSha256: sha(bytes) };
  for (const [file, hash] of Object.entries(manifest.sourceSha256)) pair.sourceSha256[`${directory}/${file}`] = hash;
}
for (const file of [...new Set(SOURCE_FILES)].sort()) pair.sourceSha256[file] = sha(await readFile(file));
pair.testSha256 = Object.fromEntries(TEST_FILES.map(file => [file, pair.sourceSha256[file]]));
pair.testSuiteSha256 = sha(JSON.stringify(pair.testSha256));
pair.sourceFingerprint = sha(JSON.stringify(pair.sourceSha256));
const before = (await readFile(resolve(APPLICATIONS.faulty, 'server/payment-policy.mjs'), 'utf8')).trimEnd().split('\n');
const after = (await readFile(resolve(APPLICATIONS.fixed, 'server/payment-policy.mjs'), 'utf8')).trimEnd().split('\n');
await writeFile('assessment/builds/fix.patch', `--- a/MustBank/Mustpayroll_buggy/server/payment-policy.mjs\n+++ b/MustBank/MustPayroll_fixed/server/payment-policy.mjs\n@@ -1,${before.length} +1,${after.length} @@\n${before.map(line => '-' + line).join('\n')}\n${after.map(line => '+' + line).join('\n')}\n`);
await writeFile('assessment/builds/pair.json', JSON.stringify(pair, null, 2)+'\n');
console.log('Both independent applications built; source, runtime and shared-test fingerprints recorded.');
