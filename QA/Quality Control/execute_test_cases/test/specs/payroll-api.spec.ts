import { expect } from '@playwright/test';
import { test, create, post, run, fault, earning, payrollSnapshot } from '../helpers';
import { readFileSync } from 'node:fs';

test('TC34 | Served build matches its package and cannot switch implementation', async ({ request, observe }, info) => {
  const pair = JSON.parse(readFileSync('results/builds.json', 'utf8'));
  const variant = process.env.QUEST_BEHAVIOR === 'faulty' ? 'faulty' : 'fixed';
  const health = await (await request.get('/api/health')).json();
  await info.attach('served-build', { body: JSON.stringify(health), contentType: 'application/json' });
  observe({ servedBuild: health.build, policySwitchStatus: null });
  expect(health.build.id).toBe(pair.builds[variant].buildId);
  expect(health.build.sourceSha256).toBe(pair.builds[variant].sourceFingerprint);
  const response = await request.post('/api/workspaces', { data: { fixture: 'single', behavior: variant === 'faulty' ? 'fixed' : 'faulty' } });
  observe({ policySwitchStatus: response.status() });
  expect(response.status()).toBe(400);
});

test('TC01 | Approved earnings aggregate into one payment per employee', async ({ request, observe }) => {
  const w = await create(request, 'standard'), result = await run(request, w.id);
  observe({ after: payrollSnapshot(result) });
  expect(result.expectedMinor).toBe(43500000); expect(result.paidMinor).toBe(43500000); expect(result.payments).toHaveLength(3);
  expect(result.payments.map((p: any) => [p.employeeId, p.amountMinor]).sort()).toEqual([['emp-001', 15000000], ['emp-002', 20000000], ['emp-003', 8500000]]);
  expect(result.notifications.every((n: any) => n.state === 'sent')).toBeTruthy();
});
test('TC02 | Opening Monday midnight is included', async ({ request, observe }) => {
  const w = await create(request, 'empty'); await post(request, w.id, 'earnings', { earnings: [earning({ earnedAt: '2026-10-05T00:00:00Z' })] });
  const result = await run(request, w.id);
  observe({ after: payrollSnapshot(result) });
  expect(result.paidMinor).toBe(15000000);
  expect(result.entries[0].earningIds).toEqual(['earn-001']);
});
test('TC03 | Following Monday midnight belongs to the next period', async ({ request, observe }) => {
  const w = await create(request, 'boundaries'), first = await run(request, w.id);
  observe({ first: payrollSnapshot(first) });
  expect(first.paidMinor).toBe(4000000); expect(first.entries[0].earningIds.sort()).toEqual(['last', 'start']);
  const next = await run(request, w.id, '2026-10-20T09:00:00Z');
  observe({ after: payrollSnapshot(next) });
  expect(next.paidMinor).toBe(4000000); expect(next.payments).toHaveLength(2);
});
test('TC04 | Lagos offset is normalized before period selection', async ({ request, observe }) => {
  const w = await create(request, 'empty'); await post(request, w.id, 'earnings', { earnings: [earning({ earningId: 'outside', earnedAt: '2026-10-05T00:30:00+01:00' }), earning({ earningId: 'inside', earnedAt: '2026-10-05T01:00:00+01:00' })] });
  const result = await run(request, w.id);
  observe({ after: payrollSnapshot(result) });
  expect(result.paidMinor).toBe(15000000); expect(result.entries[0].earningIds).toEqual(['inside']);
});
test('TC05 | Reimporting an identical earning never increases pay', async ({ request, observe }) => {
  const w = await create(request); await post(request, w.id, 'earnings', { earnings: [earning(), earning()] });
  const result = await run(request, w.id);
  observe({ after: payrollSnapshot(result) });
  expect(result.earnings).toHaveLength(1); expect(result.paidMinor).toBe(15000000);
});
test('TC06 | Conflicting duplicate rolls back the entire import', async ({ request, observe }) => {
  const w = await create(request), response = await request.post(`/api/workspaces/${w.id}/earnings`, { data: { earnings: [earning({ earningId: 'new' }), earning({ amountMinor: 1 })] } });
  const result = await (await request.get(`/api/workspaces/${w.id}`)).json();
  observe({ responseStatus: response.status(), after: payrollSnapshot(result) });
  expect(response.status()).toBe(409); expect(result.earnings).toHaveLength(1);
  expect(result.earnings[0].earningId).toBe('earn-001');
  expect(result.earnings[0].amountMinor).toBe(15000000);
});
test('TC07 | Pending approval blocks payment and leaves the period open', async ({ request, observe }) => {
  const w = await create(request, 'empty'); await post(request, w.id, 'earnings', { earnings: [earning({ status: 'pending' })] });
  const response = await request.post(`/api/workspaces/${w.id}/run`, { data: {} }); expect(response.status()).toBe(409);
  const result = await (await request.get(`/api/workspaces/${w.id}`)).json();
  observe({ responseStatus: response.status(), after: payrollSnapshot(result) });
  expect(result.locked).toBe(false); expect(result.payments).toHaveLength(0); expect(result.notifications).toHaveLength(0);
});
test('TC08 | Failed payment creates no notification and can be retried', async ({ request, observe }) => {
  const w = await create(request); await fault(request, w.id, 'payout'); const first = await run(request, w.id);
  observe({ first: payrollSnapshot(first) });
  expect(first.paidMinor).toBe(0); expect(first.notifications).toHaveLength(0); expect(first.providerAccepted).toBe(0);
  const next = await run(request, w.id);
  observe({ after: payrollSnapshot(next) });
  expect(next.paidMinor).toBe(15000000); expect(next.payments).toHaveLength(1);
});
test('TC09 | Notification failure preserves the successful payment', async ({ request, observe }) => {
  const w = await create(request); await fault(request, w.id); const result = await run(request, w.id);
  observe({ after: payrollSnapshot(result) });
  expect(result.paidMinor).toBe(15000000); expect(result.pendingNotifications).toBe(1); expect(result.providerAccepted).toBe(0);
  expect(result.events.some((e: any) => e.event === 'payment_committed')).toBeTruthy();
  expect(result.events.some((e: any) => e.event === 'notification_attempted')).toBeTruthy();
  expect(result.events.findIndex((e: any) => e.event === 'payment_committed')).toBeLessThan(result.events.findIndex((e: any) => e.event === 'notification_attempted'));
});
test('TC12 | Notification-only recovery never changes payment identity', async ({ request, observe }) => {
  const w = await create(request); await fault(request, w.id); const first = await run(request, w.id), next = await post(request, w.id, 'retry-notifications');
  observe({ first: payrollSnapshot(first), after: payrollSnapshot(next), paymentsUnchanged: JSON.stringify(first.payments) === JSON.stringify(next.payments) });
  expect(next.payments).toEqual(first.payments); expect(next.pendingNotifications).toBe(0); expect(next.providerAccepted).toBe(1);
});
test('TC13 | Interruption rolls back payment and outbox together', async ({ request, observe }, info) => {
  const w = await create(request); await fault(request, w.id, 'persistence'); const first = await run(request, w.id);
  await info.attach('observed-TC13', { body: JSON.stringify(first), contentType: 'application/json' });
  observe({ first: payrollSnapshot(first) });
  expect(first.payments).toHaveLength(0); expect(first.notifications).toHaveLength(0); expect(first.events.some((e: any) => e.event === 'payment_rolled_back')).toBeTruthy();
  const next = await run(request, w.id);
  observe({ after: payrollSnapshot(next) });
  expect(next.paidMinor).toBe(15000000); expect(next.payments).toHaveLength(1);
});
test('TC14 | Lost provider acknowledgement recovers without duplicate acceptance', async ({ request, observe }, info) => {
  const w = await create(request); await fault(request, w.id, 'ambiguous'); const first = await run(request, w.id);
  observe({ first: payrollSnapshot(first) });
  expect(first.providerAccepted).toBe(1); expect(first.pendingNotifications).toBe(1);
  const next = await run(request, w.id);
  await info.attach('observed-TC14', { body: JSON.stringify(next), contentType: 'application/json' });
  observe({ after: payrollSnapshot(next) });
  expect(next.providerAccepted).toBe(1); expect(next.pendingNotifications).toBe(0); expect(next.payments).toHaveLength(1);
});
test('TC15 | A processed period rejects new earnings and preserves approved totals', async ({ request, observe }) => {
  const w = await create(request); await run(request, w.id);
  const response = await request.post(`/api/workspaces/${w.id}/earnings`, { data: { earnings: [earning({ earningId: 'late' })] } }); expect(response.status()).toBe(409);
  const next = await run(request, w.id);
  observe({ responseStatus: response.status(), after: payrollSnapshot(next) });
  expect(next.expectedMinor).toBe(15000000); expect(next.paidMinor).toBe(15000000);
});
test('TC16 | Eight overlapping requests in one server record one payment', async ({ request, observe }, info) => {
  const w = await create(request); await fault(request, w.id); const responses = await Promise.all(Array.from({ length: 8 }, () => run(request, w.id)));
  observe({ completedRequests: responses.length });
  const result = await (await request.get(`/api/workspaces/${w.id}`)).json();
  await info.attach('observed-TC16', { body: JSON.stringify(result), contentType: 'application/json' });
  observe({ after: payrollSnapshot(result) });
  expect(result.paidMinor).toBe(15000000); expect(result.payments).toHaveLength(1); expect(result.pendingNotifications).toBe(0);
});
test('TC17 | The same employee can receive a separate payment in another period', async ({ request, observe }) => {
  const w = await create(request); await run(request, w.id);
  await post(request, w.id, 'earnings', { earnings: [earning({ earningId: 'next', earnedAt: '2026-10-12T00:00:00Z', amountMinor: 5000000 })] });
  const next = await run(request, w.id, '2026-10-20T09:00:00Z');
  observe({ after: payrollSnapshot(next) });
  expect(next.paidMinor).toBe(5000000); expect(next.payments).toHaveLength(2); expect(next.runs).toHaveLength(2);
});
test('TC18 | Invalid dates and ambiguous timestamps are rejected', async ({ request, observe }) => {
  const w = await create(request, 'empty');
  const invalidTimestamps = [];
  for (const earnedAt of ['2026-10-08T12:00:00', '2026-02-30T12:00:00Z', '2026-10-08T25:00:00Z']) {
    const response = await request.post(`/api/workspaces/${w.id}/earnings`, { data: { earnings: [earning({ earnedAt })] } });
    invalidTimestamps.push({ input: earnedAt, status: response.status() });
    observe({ invalidTimestamps });
    expect(response.status()).toBe(400);
  }
  const response = await request.post(`/api/workspaces/${w.id}/run`, { data: { scheduledFor: '2026-10-14T09:00:00Z' } });
  observe({ scheduleStatus: response.status() });
  expect(response.status()).toBe(400);
});

test('TC19 | Amounts use positive bounded whole kobo', async ({ request, observe }) => {
  const w = await create(request, 'empty');
  const invalidAmounts = [];
  for (const amountMinor of [0, -1, 1.5, 100000001, '15000000']) {
    const response = await request.post(`/api/workspaces/${w.id}/earnings`, { data: { earnings: [earning({ amountMinor })] } });
    invalidAmounts.push({ input: amountMinor, status: response.status() });
    observe({ invalidAmounts });
    expect(response.status()).toBe(400);
  }
  await post(request, w.id, 'earnings', { earnings: [earning({ amountMinor: 1 })] });
  const result = await run(request, w.id);
  observe({ after: payrollSnapshot(result) });
  expect(result.paidMinor).toBe(1);
});

test('TC20 | Unknown employees cannot acquire earnings or payments', async ({ request, observe }) => {
  const w = await create(request, 'empty');
  const unknown = await request.post(`/api/workspaces/${w.id}/earnings`, { data: { earnings: [earning({ employeeId: 'unknown' })] } });
  observe({ unknownEmployeeStatus: unknown.status() });
  expect(unknown.status()).toBe(400);
  const empty = await request.post(`/api/workspaces/${w.id}/run`, { data: {} });
  observe({ emptyPayrollStatus: empty.status() });
  expect(empty.status()).toBe(409);
});

test('TC21 | Isolated workspaces do not share earnings or payment identity', async ({ request, observe }) => {
  const a = await create(request), b = await create(request); await run(request, a.id);
  const before = await (await request.get(`/api/workspaces/${b.id}`)).json();
  observe({ unpaidSecond: payrollSnapshot(before) });
  expect(before.payments).toHaveLength(0);
  const after = await run(request, b.id);
  observe({ after: payrollSnapshot(after) });
  expect(after.paidMinor).toBe(15000000);
});
test('TC22 | Approval is explicit and replaying approval is harmless', async ({ request, observe }) => {
  const w = await create(request, 'empty'); await post(request, w.id, 'earnings', { earnings: [earning({ status: 'pending' }), earning({ earningId: 'rejected', status: 'rejected', amountMinor: 5000000 })] });
  const firstApproval = await post(request, w.id, 'earnings/earn-001/approve');
  const replay = await post(request, w.id, 'earnings/earn-001/approve');
  observe({ approvalStates: [firstApproval.earnings.find((e: any) => e.earningId === 'earn-001').status, replay.earnings.find((e: any) => e.earningId === 'earn-001').status] });
  const rejected = await request.post(`/api/workspaces/${w.id}/earnings/rejected/approve`, { data: {} });
  observe({ rejectedApprovalStatus: rejected.status() });
  expect(rejected.status()).toBe(409);
  const result = await run(request, w.id);
  observe({ after: payrollSnapshot(result) });
  expect(result.paidMinor).toBe(15000000); expect(result.entries[0].earningIds).toEqual(['earn-001']);
});
