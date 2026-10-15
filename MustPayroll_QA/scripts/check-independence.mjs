import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, copyFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, join, dirname, relative, isAbsolute } from 'node:path';
import { spawn } from 'node:child_process';
import { APPLICATIONS } from './build-inputs.mjs';

const checks = [];
for (const [variant, source] of Object.entries(APPLICATIONS)) {
  const isolated = await mkdtemp(join(tmpdir(), 'mustpayroll-standalone-'));
  const manifest = JSON.parse(await readFile(resolve(source, 'build-manifest.json'), 'utf8'));
  let child;
  try {
    for (const file of Object.keys(manifest.fileSha256)) {
      const target = resolve(isolated, file), within = relative(isolated, target);
      assert.ok(within && !within.startsWith('..') && !isAbsolute(within));
      await mkdir(dirname(target), { recursive: true }); await copyFile(resolve(source, file), target);
    }
    const port = variant === 'faulty' ? 4185 : 4186, url = `http://127.0.0.1:${port}`;
    child = spawn(process.execPath, ['server/index.mjs'], { cwd: isolated, env: { ...process.env, PORT: String(port), PAYROLL_DB: join(isolated, 'data/payroll.sqlite'), NODE_PATH: '' }, stdio: ['ignore','ignore','pipe'] });
    let errors = ''; child.stderr.on('data', data => { errors += data; });
    let health;
    for (let attempt = 0; attempt < 100; attempt++) {
      try { health = await fetch(url+'/api/health').then(r => r.json()); break; } catch { await new Promise(done => setTimeout(done, 100)); }
    }
    assert.equal(health?.build?.id, manifest.id, errors);
    assert.equal((await fetch(url+'/overview')).status, 200);
    const post = async (path, data = {}) => { const response = await fetch(url+path, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(data) }); assert.equal(response.ok, true); return response.json(); };
    const workspace = await post('/api/workspaces', { fixture:'single' });
    await post(`/api/workspaces/${workspace.id}/faults`, { kind:'notification' });
    await post(`/api/workspaces/${workspace.id}/run`);
    const result = await post(`/api/workspaces/${workspace.id}/run`);
    assert.equal(result.paidMinor, variant === 'faulty' ? 30000000 : 15000000);
    checks.push({ variant, buildId:manifest.id, copiedApplicationOnly:true, siblingApplicationAvailable:false, qaProjectAvailable:false, dependenciesInstalled:false, healthPassed:true, frontendPassed:true, recordedMinor:result.paidMinor, payments:result.payments.length });
  } finally {
    if (child && child.exitCode === null) { child.kill(); await new Promise(done => child.once('close', done)); }
    const within = relative(resolve(tmpdir()), resolve(isolated));
    assert.ok(within.startsWith('mustpayroll-standalone-') && !within.startsWith('..') && !isAbsolute(within));
    await rm(isolated, { recursive:true, force:true });
  }
}
await writeFile('assessment/evidence/independence.json', JSON.stringify({ checkedAt:new Date().toISOString(), scope:'Copied each application into a separate temporary folder; started and exercised it without its sibling, QA files or node_modules. Rebuilding separately is checked by build:pair.', checks }, null, 2)+'\n');
console.log('Both applications run independently after copying only their own files into isolated temporary folders.');
