import { test, expect } from '@playwright/test';
import { create, post, run, fault, earning } from './helpers';

test('TC01 | Approved earnings aggregate into one payment per employee', async ({ request }) => {
  const w = await create(request, 'standard'), result = await run(request, w.id);
  expect(result.expectedMinor).toBe(43500000); expect(result.paidMinor).toBe(43500000); expect(result.payments).toHaveLength(3);
  expect(result.payments.find((p: any) => p.employeeId === 'emp-001').amountMinor).toBe(15000000);
  expect(result.notifications.every((n: any) => n.state === 'sent')).toBeTruthy();
});
test('TC02 | Opening Monday midnight is included', async ({ request }) => {
  const w = await create(request, 'empty'); await post(request, w.id, 'earnings', { earnings: [earning({ earnedAt: '2026-10-05T00:00:00Z' })] });
  expect((await run(request, w.id)).paidMinor).toBe(15000000);
});
test('TC03 | Following Monday midnight belongs to the next period', async ({ request }) => {
  const w = await create(request, 'boundaries'), first = await run(request, w.id);
  expect(first.paidMinor).toBe(4000000); expect(first.entries[0].earningIds.sort()).toEqual(['last', 'start']);
  const next = await run(request, w.id, '2026-10-20T09:00:00Z'); expect(next.paidMinor).toBe(4000000); expect(next.payments).toHaveLength(2);
});
test('TC04 | Lagos offset is normalized before period selection', async ({ request }) => {
  const w = await create(request, 'empty'); await post(request, w.id, 'earnings', { earnings: [earning({ earningId: 'outside', earnedAt: '2026-10-05T00:30:00+01:00' }), earning({ earningId: 'inside', earnedAt: '2026-10-05T01:00:00+01:00' })] });
  const result = await run(request, w.id); expect(result.paidMinor).toBe(15000000); expect(result.entries[0].earningIds).toEqual(['inside']);
});
test('TC05 | Reimporting an identical earning never increases pay', async ({ request }) => {
  const w = await create(request); await post(request, w.id, 'earnings', { earnings: [earning(), earning()] });
  const result = await run(request, w.id); expect(result.earnings).toHaveLength(1); expect(result.paidMinor).toBe(15000000);
});
test('TC06 | Conflicting duplicate rolls back the entire import', async ({ request }) => {
  const w = await create(request), response = await request.post(`/api/workspaces/${w.id}/earnings`, { data: { earnings: [earning({ earningId: 'new' }), earning({ amountMinor: 1 })] } });
  expect(response.status()).toBe(409); const result = await (await request.get(`/api/workspaces/${w.id}`)).json(); expect(result.earnings).toHaveLength(1);
});
test('TC07 | Pending approval blocks payment and leaves the period open', async ({ request }) => {
  const w = await create(request, 'empty'); await post(request, w.id, 'earnings', { earnings: [earning({ status: 'pending' })] });
  const response = await request.post(`/api/workspaces/${w.id}/run`, { data: {} }); expect(response.status()).toBe(409);
  const result = await (await request.get(`/api/workspaces/${w.id}`)).json(); expect(result.locked).toBe(false); expect(result.payments).toHaveLength(0); expect(result.notifications).toHaveLength(0);
});
test('TC08 | Failed payment creates no notification and can be retried', async ({ request }) => {
  const w = await create(request); await fault(request, w.id, 'payout'); const first = await run(request, w.id);
  expect(first.paidMinor).toBe(0); expect(first.notifications).toHaveLength(0); expect(first.providerAccepted).toBe(0);
  const next = await run(request, w.id); expect(next.paidMinor).toBe(15000000); expect(next.payments).toHaveLength(1);
});
test('TC09 | Notification failure preserves the successful payment', async ({ request }) => {
  const w = await create(request); await fault(request, w.id); const result = await run(request, w.id);
  expect(result.paidMinor).toBe(15000000); expect(result.pendingNotifications).toBe(1); expect(result.providerAccepted).toBe(0);
  expect(result.events.findIndex((e: any) => e.event === 'payment_committed')).toBeLessThan(result.events.findIndex((e: any) => e.event === 'notification_attempted'));
});
test('TC12 | Notification-only recovery never changes payment identity', async ({ request }) => {
  const w = await create(request); await fault(request, w.id); const first = await run(request, w.id), next = await post(request, w.id, 'retry-notifications');
  expect(next.payments).toEqual(first.payments); expect(next.pendingNotifications).toBe(0); expect(next.providerAccepted).toBe(1);
});
test('TC13 | Interruption rolls back payment and outbox together', async ({ request }) => {
  const w = await create(request); await fault(request, w.id, 'persistence'); const first = await run(request, w.id);
  expect(first.payments).toHaveLength(0); expect(first.notifications).toHaveLength(0); expect(first.events.some((e: any) => e.event === 'payment_rolled_back')).toBeTruthy();
  const next = await run(request, w.id); expect(next.paidMinor).toBe(15000000); expect(next.payments).toHaveLength(1);
});
test('TC14 | Lost provider acknowledgement recovers without duplicate acceptance', async ({ request }) => {
  const w = await create(request); await fault(request, w.id, 'ambiguous'); const first = await run(request, w.id);
  expect(first.providerAccepted).toBe(1); expect(first.pendingNotifications).toBe(1);
  const next = await run(request, w.id); expect(next.providerAccepted).toBe(1); expect(next.pendingNotifications).toBe(0); expect(next.payments).toHaveLength(1);
});
test('TC15 | A processed period rejects new earnings and preserves approved totals', async ({ request }) => {
  const w = await create(request); await run(request, w.id);
  const response = await request.post(`/api/workspaces/${w.id}/earnings`, { data: { earnings: [earning({ earningId: 'late' })] } }); expect(response.status()).toBe(409);
  const next = await run(request, w.id); expect(next.expectedMinor).toBe(15000000); expect(next.paidMinor).toBe(15000000);
});
test('TC16 | Eight overlapping requests in one server record one payment', async ({ request }) => {
  const w = await create(request); await fault(request, w.id); await Promise.all(Array.from({ length: 8 }, () => run(request, w.id)));
  const result = await (await request.get(`/api/workspaces/${w.id}`)).json(); expect(result.paidMinor).toBe(15000000); expect(result.payments).toHaveLength(1); expect(result.pendingNotifications).toBe(0);
});
test('TC17 | The same employee can receive a separate payment in another period', async ({ request }) => {
  const w = await create(request); await run(request, w.id);
  await post(request, w.id, 'earnings', { earnings: [earning({ earningId: 'next', earnedAt: '2026-10-12T00:00:00Z', amountMinor: 5000000 })] });
  const next = await run(request, w.id, '2026-10-20T09:00:00Z'); expect(next.paidMinor).toBe(5000000); expect(next.payments).toHaveLength(2); expect(next.runs).toHaveLength(2);
});
test('TC18 | Invalid dates and ambiguous timestamps are rejected', async ({ request }) => {
  const w = await create(request, 'empty');
  for (const earnedAt of ['2026-10-08T12:00:00', '2026-02-30T12:00:00Z', '2026-10-08T25:00:00Z']) expect((await request.post(`/api/workspaces/${w.id}/earnings`, { data: { earnings: [earning({ earnedAt })] } })).status()).toBe(400);
  expect((await request.post(`/api/workspaces/${w.id}/run`, { data: { scheduledFor: '2026-10-14T09:00:00Z' } })).status()).toBe(400);
});
test('TC19 | Amounts use positive bounded whole kobo', async ({ request }) => {
  const w = await create(request, 'empty');
  for (const amountMinor of [0, -1, 1.5, 100000001, '15000000']) expect((await request.post(`/api/workspaces/${w.id}/earnings`, { data: { earnings: [earning({ amountMinor })] } })).status()).toBe(400);
  await post(request, w.id, 'earnings', { earnings: [earning({ amountMinor: 1 })] }); expect((await run(request, w.id)).paidMinor).toBe(1);
});
test('TC20 | Unknown employees cannot acquire earnings or payments', async ({ request }) => {
  const w = await create(request, 'empty'); expect((await request.post(`/api/workspaces/${w.id}/earnings`, { data: { earnings: [earning({ employeeId: 'unknown' })] } })).status()).toBe(400);
  expect((await request.post(`/api/workspaces/${w.id}/run`, { data: {} })).status()).toBe(409);
});
test('TC21 | Isolated workspaces do not share earnings or payment identity', async ({ request }) => {
  const a = await create(request), b = await create(request); await run(request, a.id);
  const before = await (await request.get(`/api/workspaces/${b.id}`)).json(); expect(before.payments).toHaveLength(0);
  const after = await run(request, b.id); expect(after.paidMinor).toBe(15000000);
});
test('TC22 | Approval is explicit and replaying approval is harmless', async ({ request }) => {
  const w = await create(request, 'empty'); await post(request, w.id, 'earnings', { earnings: [earning({ status: 'pending' }), earning({ earningId: 'rejected', status: 'rejected', amountMinor: 5000000 })] });
  await post(request, w.id, 'earnings/earn-001/approve'); await post(request, w.id, 'earnings/earn-001/approve');
  expect((await request.post(`/api/workspaces/${w.id}/earnings/rejected/approve`, { data: {} })).status()).toBe(409);
  const result = await run(request, w.id); expect(result.paidMinor).toBe(15000000); expect(result.entries[0].earningIds).toEqual(['earn-001']);
});
