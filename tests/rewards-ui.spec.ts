import { test, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { create, openExample, type Scenario } from './helpers';

test('TC10 | notification failure then settlement replay leaves 10 credits', async ({ page, request }, testInfo) => {
  const mode = process.env.QUEST_BEHAVIOR === 'faulty' ? 'faulty' : 'fixed';
  const scenario = await create(request, undefined, mode);
  await openExample(page, scenario.id);
  await page.getByRole('button', { name: 'Fail next notification', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('next notification attempt will fail once');
  await page.getByRole('button', { name: 'Run settlement', exact: true }).click();
  await expect(page.getByTestId('reward-balance')).toHaveText('10 credits');
  await expect(page.getByTestId('pending-count')).toHaveText('1');
  const firstAttempt = await (await request.get(`/api/scenarios/${scenario.id}`)).json();
  await testInfo.attach('first-attempt', { body: JSON.stringify(firstAttempt, null, 2), contentType: 'application/json' });
  await page.getByRole('button', { name: 'Run settlement', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('new payouts');
  await expect(page.getByRole('button', { name: 'Run settlement', exact: true })).toBeEnabled();
  const observed: Scenario = await (await request.get(`/api/scenarios/${scenario.id}`)).json();
  await testInfo.attach('observed-scenario', { body: JSON.stringify(observed, null, 2), contentType: 'application/json' });
  await mkdir('assessment/evidence', { recursive: true });
  await page.screenshot({ path: `assessment/evidence/${mode}-reproduction.png`, fullPage: true });
  // Exactly the same business expectation in both modes. The faulty run must fail here.
  await expect(page.getByTestId('reward-balance')).toHaveText('10 credits');
  await expect(page.getByTestId('payout-count')).toHaveText('1');
  await expect(page.getByTestId('pending-count')).toHaveText('0');
});

test('TC21 | a task added through the form pays its stable owner', async ({ page, request }) => {
  const scenario = await create(request); await openExample(page, scenario.id);
  await page.getByText('Add a task', { exact: true }).click();
  await page.getByLabel('Task ID', { exact: true }).fill('task-added');
  await page.getByLabel('User ID', { exact: true }).fill('user-002');
  await page.getByLabel('Task description', { exact: true }).fill('Second customer completes a task');
  await page.getByRole('button', { name: 'Save task', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Saved the task');
  await page.getByRole('button', { name: 'Run settlement', exact: true }).click();
  await expect(page.getByTestId('reward-balance')).toHaveText('20 credits');
  const result: Scenario = await (await request.get(`/api/scenarios/${scenario.id}`)).json();
  expect(result.balances).toEqual({ 'user-001': 10, 'user-002': 10 });
});
test('TC22 | browser reload preserves payment and recovery work', async ({ page, request }) => {
  const scenario = await create(request); await openExample(page, scenario.id);
  await page.getByRole('button', { name: 'Fail next notification', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('next notification attempt will fail once');
  await page.getByRole('button', { name: 'Run settlement', exact: true }).click();
  await expect(page.getByTestId('pending-count')).toHaveText('1');
  await page.reload();
  await expect(page.getByTestId('reward-balance')).toHaveText('10 credits');
  await expect(page.getByTestId('pending-count')).toHaveText('1');
  await page.getByRole('button', { name: 'Retry notifications', exact: true }).click();
  await expect(page.getByTestId('pending-count')).toHaveText('0');
  await expect(page.getByTestId('reward-balance')).toHaveText('10 credits');
  await expect(page.getByTestId('payout-count')).toHaveText('1');
});
test('TC24 | narrow-screen recovery works through keyboard controls', async ({ page, request }) => {
  const scenario = await create(request);
  await page.setViewportSize({ width: 380, height: 820 }); await openExample(page, scenario.id);
  await page.getByRole('button', { name: 'Fail next notification', exact: true }).focus();
  await page.keyboard.press('Enter'); await expect(page.getByRole('status')).toContainText('next notification attempt will fail once');
  await page.getByRole('button', { name: 'Run settlement', exact: true }).focus();
  await page.keyboard.press('Enter'); await expect(page.getByTestId('pending-count')).toHaveText('1');
  await page.getByRole('button', { name: 'Retry notifications', exact: true }).focus();
  await page.keyboard.press('Enter'); await expect(page.getByTestId('pending-count')).toHaveText('0');
  await expect(page.getByTestId('reward-balance')).toHaveText('10 credits');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: 'assessment/evidence/narrow-screen.png', fullPage: true });
});

test('TC25 | the original simulated transfer still works without WebMCP', async ({ page }) => {
  await page.goto('/transfer');
  await expect(page.getByRole('heading', { name: 'Transfer money', exact: true })).toBeVisible();
  await page.getByPlaceholder('0.00', { exact: true }).fill('10.00');
  await page.getByPlaceholder('Optional note', { exact: true }).fill('Regression smoke check');
  await page.getByRole('button', { name: 'Send transfer', exact: true }).click();
  await expect(page.getByText(/Sent .*10\.00.*Reference/)).toBeVisible();
});
