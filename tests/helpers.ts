import { expect, type APIRequestContext, type Page } from '@playwright/test';
export const RUN = '2026-10-13T09:00:00Z';
export const TASK = { taskId: 'task-001', userId: 'user-001', title: 'Qualifying task', completedAt: '2026-10-08T12:00:00Z' };
export type TaskInput = typeof TASK & { status?: 'completed' | 'pending' | 'cancelled' };
export type Scenario = { id: string; totalCredits: number; pendingNotifications: number;
  balances: Record<string, number>; tasks: { taskId: string }[];
  payouts: { taskId: string; userId: string; credits: number }[];
  notifications: { state: string; attempts: number }[]; receipts: unknown[];
  events: { event: string }[]; run: { failures: unknown[] } };

export async function create(request: APIRequestContext, tasks: TaskInput[] = [TASK], mode = 'fixed') {
  const response = await request.post('/api/scenarios', { data: { fixture: 'empty', mode } });
  expect(response.status()).toBe(201);
  const initial: Scenario = await response.json();
  const imported = await request.post(`/api/scenarios/${initial.id}/tasks`, { data: { tasks } });
  expect(imported.status()).toBe(200);
  return await imported.json() as Scenario;
}
export async function settle(request: APIRequestContext, id: string, scheduledFor = RUN) {
  const response = await request.post(`/api/scenarios/${id}/settle`, { data: { scheduledFor } });
  expect(response.status()).toBe(200);
  return await response.json() as Scenario;
}
export async function fault(request: APIRequestContext, id: string, kind: string) {
  const response = await request.post(`/api/scenarios/${id}/faults`, { data: { kind } });
  expect(response.status()).toBe(200);
}
export async function openExample(page: Page, id: string) {
  await page.addInitScript(exampleId => localStorage.setItem('mustbank.quest.example.v1', exampleId), id);
  await page.goto('/rewards');
  await expect(page.getByTestId('reward-balance')).toHaveText('0 credits');
  await expect(page.getByRole('button', { name: 'Run settlement', exact: true })).toBeEnabled();
}
