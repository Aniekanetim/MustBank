import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, relative, isAbsolute } from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
const buildRoot = resolve(process.env.PAYROLL_TEST_BUILD_DIR ?? '../MustBank/MustPayroll_fixed');
const { PayrollService } = await import(pathToFileURL(join(buildRoot, 'server/payroll.mjs')).href);

test('TC11 | Fresh process preserves employee-period payment identity', () => {
  const folder = mkdtempSync(join(tmpdir(), 'mustpayroll-recovery-')), database = join(folder, 'payroll.sqlite');
  const service = new PayrollService(database); let closed = false;
  try {
    const w = service.create({ fixture: 'single' }); service.setFault(w.id, 'notification');
    const first = service.execute(w.id); assert.equal(first.paidMinor, 15000000); assert.equal(first.pendingNotifications, 1);
    service.close(); closed = true;
    const child = spawnSync(process.execPath, ['scripts/process-probe.mjs', database, w.id], { encoding: 'utf8', timeout: 15000 });
    assert.equal(child.status, 0, child.stderr); const result = JSON.parse(child.stdout);
    if (process.env.PAYROLL_PROCESS_RECORD) writeFileSync(process.env.PAYROLL_PROCESS_RECORD, JSON.stringify({ first, afterRestart: result }, null, 2));
    assert.equal(result.paidMinor, 15000000); assert.equal(result.payments.length, 1); assert.equal(result.pendingNotifications, 0);
    assert.equal(result.payments[0].id, first.payments[0].id);
  } finally {
    if (!closed) service.close();
    const withinTemp = relative(resolve(tmpdir()), resolve(folder));
    assert.ok(withinTemp && !withinTemp.startsWith('..') && !isAbsolute(withinTemp) && withinTemp.startsWith('mustpayroll-recovery-'));
    rmSync(folder, { recursive: true, force: true });
  }
});
