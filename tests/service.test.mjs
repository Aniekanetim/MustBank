import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, relative, isAbsolute } from 'node:path';
import { spawnSync } from 'node:child_process';
import { RewardsService } from '../server/rewards.mjs';

test('TC11 | a fresh Node process retains payout identity and recovers notification', () => {
  const folder = mkdtempSync(join(tmpdir(), 'mustbank-recovery-'));
  const database = join(folder, 'rewards.sqlite');
  const service = new RewardsService(database);
  let closed = false;
  try {
    const scenario = service.create(); service.setFault(scenario.id, 'notification');
    assert.equal(service.settle(scenario.id).totalCredits, 10);
    service.close(); closed = true;
    const child = spawnSync(process.execPath, ['scripts/process-probe.mjs', database, scenario.id], { encoding: 'utf8', timeout: 15000 });
    assert.equal(child.status, 0, child.stderr);
    const result = JSON.parse(child.stdout);
    assert.equal(result.totalCredits, 10); assert.equal(result.payouts.length, 1); assert.equal(result.pendingNotifications, 0);
  } finally {
    if (!closed) service.close();
    const target = resolve(folder);
    const withinTemp = relative(resolve(tmpdir()), target);
    assert.ok(withinTemp && !withinTemp.startsWith('..') && !isAbsolute(withinTemp) && withinTemp.startsWith('mustbank-recovery-'), 'Cleanup must stay inside the created temporary fixture.');
    rmSync(folder, { recursive: true, force: true });
  }
});
