import { test, expect } from '@playwright/test';
import { create, fault, RUN, settle, TASK, type Scenario } from './helpers';

test('TC01 | a completed task pays 10 credits before notification', async ({ request }) => {
  const scenario = await create(request);
  const result = await settle(request, scenario.id);
  expect(result.totalCredits).toBe(10);
  expect(result.payouts).toHaveLength(1);
  expect(result.payouts[0].userId).toBe('user-001');
  expect(result.receipts).toHaveLength(1);
  expect(result.notifications[0].state).toBe('sent');
  const events = result.events.map(event => event.event);
  expect(events.indexOf('payout_committed')).toBeLessThan(events.indexOf('notification_attempted'));
});
test('TC03 | the lower Monday boundary is included', async ({ request }) => {
  const scenario = await create(request, [{ ...TASK, completedAt: '2026-10-05T00:00:00Z' }]);
  expect((await settle(request, scenario.id)).totalCredits).toBe(10);
});

test('TC02 | an empty weekly run creates no payment or notification', async ({ request }) => {
  const scenario = await create(request, []);
  const result = await settle(request, scenario.id);
  expect(result.totalCredits).toBe(0); expect(result.payouts).toHaveLength(0); expect(result.notifications).toHaveLength(0);
});
test('TC04 | the upper Monday boundary is excluded', async ({ request }) => {
  const scenario = await create(request, [{ ...TASK, completedAt: '2026-10-12T00:00:00Z' }]);
  const result = await settle(request, scenario.id);
  expect(result.totalCredits).toBe(0); expect(result.notifications).toHaveLength(0);
});
test('TC05 | Lagos offset timestamps are compared as UTC instants', async ({ request }) => {
  const scenario = await create(request, [{ ...TASK, taskId: 'before', completedAt: '2026-10-05T00:30:00+01:00' },
    { ...TASK, taskId: 'start', completedAt: '2026-10-05T01:00:00+01:00' }]);
  const result = await settle(request, scenario.id);
  expect(result.totalCredits).toBe(10); expect(result.payouts.map(row => row.taskId)).toEqual(['start']);
});
test('TC06 | pending and cancelled tasks cannot earn rewards', async ({ request }) => {
  const scenario = await create(request, [{ ...TASK, taskId: 'pending', status: 'pending' }, { ...TASK, taskId: 'cancelled', status: 'cancelled' }]);
  const result = await settle(request, scenario.id);
  expect(result.totalCredits).toBe(0); expect(result.notifications).toHaveLength(0);
});
test('TC07 | duplicate task input earns one reward', async ({ request }) => {
  const scenario = await create(request, [TASK, TASK, TASK]);
  expect(scenario.tasks).toHaveLength(1);
  const result = await settle(request, scenario.id);
  expect(result.totalCredits).toBe(10); expect(result.payouts).toHaveLength(1);
});
test('TC08 | replay after success cannot pay again', async ({ request }) => {
  const scenario = await create(request); await settle(request, scenario.id);
  const result = await settle(request, scenario.id);
  expect(result.totalCredits).toBe(10); expect(result.payouts).toHaveLength(1); expect(result.receipts).toHaveLength(1);
});
test('TC09 | failed notification preserves the payout and pending message', async ({ request }) => {
  const scenario = await create(request); await fault(request, scenario.id, 'notification');
  const result = await settle(request, scenario.id);
  expect(result.totalCredits).toBe(10); expect(result.pendingNotifications).toBe(1);
  expect(result.receipts).toHaveLength(0); expect(result.run.failures).toHaveLength(1);
});
test('TC12 | failed payment sends no success notification', async ({ request }) => {
  const scenario = await create(request); await fault(request, scenario.id, 'payout');
  const failed = await settle(request, scenario.id);
  expect(failed.totalCredits).toBe(0); expect(failed.notifications).toHaveLength(0); expect(failed.receipts).toHaveLength(0);
  expect((await settle(request, scenario.id)).totalCredits).toBe(10);
});
test('TC13 | interrupted local recording rolls back before commit', async ({ request }) => {
  const scenario = await create(request); await fault(request, scenario.id, 'persistence');
  const failed = await settle(request, scenario.id);
  expect(failed.totalCredits).toBe(0); expect(failed.payouts).toHaveLength(0); expect(failed.notifications).toHaveLength(0);
  const retried = await settle(request, scenario.id);
  expect(retried.totalCredits).toBe(10); expect(retried.payouts).toHaveLength(1);
});
test('TC14 | the excluded boundary pays once in the following week', async ({ request }) => {
  const scenario = await create(request, [{ ...TASK, completedAt: '2026-10-12T00:00:00Z' }]);
  expect((await settle(request, scenario.id)).totalCredits).toBe(0);
  await settle(request, scenario.id, '2026-10-20T09:00:00Z');
  expect((await settle(request, scenario.id, '2026-10-20T09:00:00Z')).totalCredits).toBe(10);
});
test('TC15 | conflicting duplicate owners reject the whole import', async ({ request }) => {
  const scenario = await create(request, []);
  const response = await request.post(`/api/scenarios/${scenario.id}/tasks`, { data: { tasks: [TASK, { ...TASK, userId: 'user-002' }] } });
  expect(response.status()).toBe(400);
  const state: Scenario = await (await request.get(`/api/scenarios/${scenario.id}`)).json();
  expect(state.tasks).toHaveLength(0); expect(state.totalCredits).toBe(0);
});
test('TC16 | a naive timestamp cannot produce partial import', async ({ request }) => {
  const scenario = await create(request, []);
  const response = await request.post(`/api/scenarios/${scenario.id}/tasks`, { data: { tasks: [TASK, { ...TASK, taskId: 'naive', completedAt: '2026-10-08T12:00:00' }] } });
  expect(response.status()).toBe(400);
  const state: Scenario = await (await request.get(`/api/scenarios/${scenario.id}`)).json();
  expect(state.tasks).toHaveLength(0); expect(state.totalCredits).toBe(0);
});
test('TC17 | overlapping HTTP settlement requests create one payout', async ({ request }) => {
  const scenario = await create(request);
  await Promise.all(Array.from({ length: 8 }, () => settle(request, scenario.id)));
  const result: Scenario = await (await request.get(`/api/scenarios/${scenario.id}`)).json();
  expect(result.totalCredits).toBe(10); expect(result.payouts).toHaveLength(1); expect(result.receipts).toHaveLength(1);
});
test('TC18 | a lost notification acknowledgment cannot repay the task', async ({ request }) => {
  const scenario = await create(request); await fault(request, scenario.id, 'ambiguous');
  const failed = await settle(request, scenario.id);
  expect(failed.totalCredits).toBe(10); expect(failed.pendingNotifications).toBe(1); expect(failed.receipts).toHaveLength(1);
  const recovered = await settle(request, scenario.id);
  expect(recovered.totalCredits).toBe(10); expect(recovered.pendingNotifications).toBe(0); expect(recovered.receipts).toHaveLength(1);
});
test('TC19 | invalid scheduled run identity has no payout effects', async ({ request }) => {
  const scenario = await create(request);
  for (const scheduledFor of ['2026-10-13T10:00:00Z', '2026-10-14T09:00:00Z']) {
    expect((await request.post(`/api/scenarios/${scenario.id}/settle`, { data: { scheduledFor } })).status()).toBe(400);
  }
  const state: Scenario = await (await request.get(`/api/scenarios/${scenario.id}`)).json();
  expect(state.totalCredits).toBe(0);
});

test('TC20 | a stored task cannot change owner or completion time', async ({ request }) => {
  const scenario = await create(request); await settle(request, scenario.id);
  for (const changed of [{ ...TASK, userId: 'user-002' }, { ...TASK, completedAt: '2026-10-12T00:00:00Z' }]) {
    expect((await request.post(`/api/scenarios/${scenario.id}/tasks`, { data: { tasks: [changed] } })).status()).toBe(400);
  }
  const state: Scenario = await (await request.get(`/api/scenarios/${scenario.id}`)).json();
  expect(state.balances).toEqual({ 'user-001': 10 }); expect(state.payouts).toHaveLength(1);
});

test('TC23 | invalid calendar dates and 24-hour rollover reject input', async ({ request }) => {
  const scenario = await create(request, []);
  for (const completedAt of ['2026-02-30T12:00:00Z', '2026-10-08T24:00:00Z']) {
    expect((await request.post(`/api/scenarios/${scenario.id}/tasks`, { data: { tasks: [{ ...TASK, completedAt }] } })).status()).toBe(400);
  }
  const state: Scenario = await (await request.get(`/api/scenarios/${scenario.id}`)).json();
  expect(state.tasks).toHaveLength(0);
});
