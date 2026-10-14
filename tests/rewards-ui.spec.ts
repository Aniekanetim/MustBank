import { test, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { create, openExample, settle, type Scenario } from './helpers';

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

test('TC25 | a simulated bank transfer completes with a reference', async ({ page }) => {
  await page.goto('/transfer');
  await expect(page.getByRole('heading', { name: 'Transfer money', exact: true })).toBeVisible();
  await page.getByPlaceholder('0.00', { exact: true }).fill('10.00');
  await page.getByPlaceholder('Optional note', { exact: true }).fill('Regression smoke check');
  await page.getByRole('button', { name: 'Send transfer', exact: true }).click();
  await expect(page.getByText(/Sent .*10\.00.*Reference/)).toBeVisible();
});

test('TC26 | every banking page presents MustBank and the assessment scope', async ({ page }) => {
  test.setTimeout(60000);
  await page.goto('/rewards');
  for (const [link, heading] of [['Rewards', 'Rewards and settlements'], ['Dashboard', 'Account overview'],
    ['Transfer', 'Transfer money'], ['Recipients', 'Saved recipients'], ['Transactions', 'Transactions']]) {
    await page.getByRole('link', { name: link, exact: true }).click();
    await expect(page.getByRole('heading', { name: heading, exact: true })).toBeVisible();
    await expect(page).toHaveTitle('MustBank · Quest assessment');
    const navigation = page.getByRole('complementary', { name: 'Application navigation' });
    await expect(navigation.getByText('MustBank', { exact: true })).toBeVisible();
    await expect(navigation.getByText('Quest assessment', { exact: false })).toBeVisible();
  }
  await page.screenshot({ path: 'assessment/evidence/mustbank-transactions.png', fullPage: true });
});

test('TC27 | namespace migration preserves balances and a paid reward identity', async ({ page, request }) => {
  test.setTimeout(45000);
  const scenario = await create(request); await settle(request, scenario.id);
  await page.addInitScript(exampleId => {
    // A compatible previous namespace models an installation before rebranding.
    localStorage.setItem('previousbank.quest.example.v1', exampleId);
    localStorage.setItem('previousbank.state.v1', JSON.stringify({
      accounts: [{ id: 'acc_chk', nickname: 'Everyday Checking', type: 'checking', number: '4071', balance: 123_0000, currency: 'SGD' }],
      recipients: [], transactions: [],
    }));
  }, scenario.id);
  await page.goto('/rewards');
  await expect(page.getByTestId('reward-balance')).toHaveText('10 credits');
  await page.getByRole('button', { name: 'Run settlement', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('0 new payouts');
  await expect(page.getByTestId('payout-count')).toHaveText('1');
  await expect(page.getByTestId('reward-balance')).toHaveText('10 credits');
  await page.getByRole('link', { name: 'Dashboard', exact: true }).click();
  await expect(page.getByText('$123.00', { exact: true })).toBeVisible();
  const state = await page.evaluate(() => ({
    example: localStorage.getItem('mustbank.quest.example.v1'), bank: JSON.parse(localStorage.getItem('mustbank.state.v1')!),
    previousExample: localStorage.getItem('previousbank.quest.example.v1'), previousBank: localStorage.getItem('previousbank.state.v1'),
  }));
  expect(state.example).toBe(scenario.id); expect(state.bank.accounts[0].balance).toBe(123_0000);
  expect(state.previousExample).toBeNull(); expect(state.previousBank).toBeNull();
});
