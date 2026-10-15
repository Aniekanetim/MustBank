import { expect, type APIRequestContext } from '@playwright/test';
export const RUN = '2026-10-13T09:00:00.000Z';
export const earning = (overrides: Record<string, unknown> = {}) => ({ earningId: 'earn-001', employeeId: 'emp-001', description: 'Weekly project earnings', earnedAt: '2026-10-08T12:00:00Z', amountMinor: 15000000, status: 'approved', ...overrides });
export async function create(request: APIRequestContext, fixture = 'single', behavior = 'fixed') {
  const response = await request.post('/api/workspaces', { data: { fixture, behavior } }); expect(response.status()).toBe(201); return response.json();
}
export async function post(request: APIRequestContext, id: string, action: string, data: unknown = {}) {
  const response = await request.post(`/api/workspaces/${id}/${action}`, { data }); expect(response.ok(), await response.text()).toBeTruthy(); return response.json();
}
export const run = (request: APIRequestContext, id: string, scheduledFor = RUN) => post(request, id, 'run', { scheduledFor });
export const fault = (request: APIRequestContext, id: string, kind = 'notification') => post(request, id, 'faults', { kind });
