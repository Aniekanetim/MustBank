import { spawn } from 'node:child_process';
import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises';
import { resolve, dirname, relative } from 'node:path';
import { createHash } from 'node:crypto';
import { SOURCE_FILES, TEST_FILES } from './build-inputs.mjs';
import { writeZip } from './zip.mjs';

const root = process.cwd(), npmCli = process.env.npm_execpath;
if (!npmCli) throw new Error('Run npm run build:pair.');
const sha = value => createHash('sha256').update(value).digest('hex');
const child = spawn(process.execPath, [npmCli, 'run', 'build'], { stdio: 'inherit' });
if (await new Promise((done, reject) => { child.on('error', reject); child.on('close', done); })) throw new Error('Frontend build failed.');
const sourceSha256 = {};
for (const path of [...new Set(SOURCE_FILES)].sort()) sourceSha256[path] = sha(await readFile(path));
const sourceFingerprint = sha(JSON.stringify(sourceSha256));
const testSha256 = Object.fromEntries(TEST_FILES.map(file => [file, sourceSha256[file]]));
const testSuiteSha256 = sha(JSON.stringify(testSha256));
const version = JSON.parse(await readFile('package.json', 'utf8')).version;
const generatedAt = new Date().toISOString();
const common = {};
async function collect(folder) {
  for (const entry of await readdir(folder, { withFileTypes: true })) {
    const path = resolve(folder, entry.name);
    if (entry.isDirectory()) await collect(path);
    else common[relative(root, path).replaceAll('\\', '/')] = await readFile(path);
  }
}
await collect(resolve('dist'));
for (const file of ['server/payroll.mjs', 'server/index.mjs', 'scripts/scenario.mjs', 'LICENSE']) common[file] = await readFile(file);
await mkdir('assessment/builds', { recursive: true });
const pair = { application: 'MustPayroll', generatedAt, sourceFingerprint, sourceSha256, testSuiteSha256, testSha256, builds: {} };
for (const variant of ['faulty', 'fixed']) {
  const buildId = `mustpayroll-${version}-${variant}-${sourceFingerprint.slice(0, 12)}`;
  const port = variant === 'faulty' ? 4175 : 4176;
  const directory = `output/builds/${buildId}`;
  const info = { id: buildId, variant, defaultPort: port, sourceSha256: sourceFingerprint };
  const files = { ...common,
    'server/payment-policy.mjs': await readFile(`server/policies/${variant}.mjs`),
    'server/build-info.mjs': `export const BUILD_INFO = ${JSON.stringify(info, null, 2)};\n`,
    'package.json': JSON.stringify({ name: `mustpayroll-${variant}`, version, private: true, type: 'module', license: 'MIT', engines: { node: '>=22.13.0' }, scripts: { start: 'node server/index.mjs', scenario: 'node scripts/scenario.mjs' } }, null, 2) + '\n',
    'README.md': `# MustPayroll ${variant} build\n\nBuild: ${buildId}\n\nRequires Node.js 22.13 or later. No dependency installation is needed for this prebuilt application.\n\nRun npm start, then open http://127.0.0.1:${port}/overview.\n\nTo prepare the reproduction, run npm run scenario -- --fail-notification and open its printed URL. Process once, then retry the original pay run.\n\nThis package contains only the ${variant} payment implementation. Its API rejects requests to switch implementation. The other build is a separate download with a separate database.\n\nPayment records are synthetic local ledger entries. This is not a live payroll service. Source, test records and MIT attribution: https://github.com/Aniekanetim/MustBank\n`,
  };
  const fileSha256 = Object.fromEntries(Object.entries(files).sort(([a], [b]) => a.localeCompare(b)).map(([file, bytes]) => [file, sha(bytes)]));
  const manifest = { ...info, generatedAt, sourceFingerprint, testSuiteSha256, fileSha256 };
  files['build-manifest.json'] = JSON.stringify(manifest, null, 2) + '\n';
  for (const [file, bytes] of Object.entries(files)) { const path = resolve(directory, file); await mkdir(dirname(path), { recursive: true }); await writeFile(path, bytes); }
  const archive = `assessment/builds/MustPayroll-${variant}.zip`, manifestPath = `assessment/builds/${variant}-manifest.json`;
  await writeZip(archive, files);
  await writeFile(manifestPath, files['build-manifest.json']);
  pair.builds[variant] = { buildId, variant, port, directory, archive, archiveSha256: sha(await readFile(archive)), manifest: manifestPath, manifestSha256: sha(files['build-manifest.json']) };
  console.log(`${variant}: ${buildId}\n  ${archive}\n  http://127.0.0.1:${port}/overview`);
}
const before = (await readFile('server/policies/faulty.mjs', 'utf8')).trimEnd().split('\n');
const after = (await readFile('server/policies/fixed.mjs', 'utf8')).trimEnd().split('\n');
await writeFile('assessment/builds/fix.patch', `--- a/server/payment-policy.mjs\n+++ b/server/payment-policy.mjs\n@@ -1,${before.length} +1,${after.length} @@\n${before.map(line => '-' + line).join('\n')}\n${after.map(line => '+' + line).join('\n')}\n`);
await writeFile('assessment/builds/pair.json', JSON.stringify(pair, null, 2) + '\n');
