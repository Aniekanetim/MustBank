import { test as base, expect, type APIRequestContext } from '@playwright/test';

export const test = base.extend<{ observe: (values: Record<string, unknown>) => void }>({
  observe: async ({}, use, info) => {
    const observation: Record<string, unknown> = {};
    await use(values => Object.assign(observation, values));
    await info.attach('case-observation', { body: JSON.stringify(observation), contentType: 'application/json' });
  },
});

// Keep the values used in the written result, without duplicating full workspaces.
export function payrollSnapshot(state: Record<string, any>) {
  return {
    workspaceId: state.id, expectedMinor: state.expectedMinor, paidMinor: state.paidMinor,
    locked: state.locked, pendingNotifications: state.pendingNotifications,
    providerAccepted: state.providerAccepted, runCount: state.runs.length,
    earnings: state.earnings.map((e: any) => ({ id: e.earningId, amountMinor: e.amountMinor, status: e.status })),
    earningIdsInPeriod: state.entries.flatMap((e: any) => e.earningIds).sort(),
    payments: state.payments.map((p: any) => ({ id: p.id, employeeId: p.employeeId, employeeName: p.employeeName, amountMinor: p.amountMinor, periodStart: p.periodStart })),
    notifications: state.notifications.map((n: any) => ({ id: n.id, paymentId: n.paymentId, state: n.state })),
    events: state.events.map((e: any) => e.event),
  };
}
export const RUN = '2026-10-13T09:00:00.000Z';
export const earning = (overrides: Record<string, unknown> = {}) => ({ earningId: 'earn-001', employeeId: 'emp-001', description: 'Weekly project earnings', earnedAt: '2026-10-08T12:00:00Z', amountMinor: 15000000, status: 'approved', ...overrides });
export async function create(request: APIRequestContext, fixture = 'single') {
  const response = await request.post('/api/workspaces', { data: { fixture } }); expect(response.status()).toBe(201); return response.json();
}
export async function post(request: APIRequestContext, id: string, action: string, data: unknown = {}) {
  const response = await request.post(`/api/workspaces/${id}/${action}`, { data }); expect(response.ok(), await response.text()).toBeTruthy(); return response.json();
}
export const run = (request: APIRequestContext, id: string, scheduledFor = RUN) => post(request, id, 'run', { scheduledFor });
export const fault = (request: APIRequestContext, id: string, kind = 'notification') => post(request, id, 'faults', { kind });
