import { test, expect } from '@playwright/test';
import { mkdir, readFile } from 'node:fs/promises';
import { create, fault, openExample, settle, TASK, type Scenario } from './helpers';

test('TC10 | notification failure then settlement replay leaves 10 credits', async ({ page, request }, testInfo) => {
  const mode = process.env.QUEST_BEHAVIOR === 'faulty' ? 'faulty' : 'fixed';
  const scenario = await create(request, undefined, mode); await fault(request, scenario.id, 'notification');
  await openExample(page, scenario.id);
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
  // The business expectation stays identical across both processing implementations.
  await expect(page.getByTestId('reward-balance')).toHaveText('10 credits');
  await expect(page.getByTestId('payout-count')).toHaveText('1');
  await expect(page.getByTestId('pending-count')).toHaveText('0');
});

test('TC21 | an activity recorded in operations pays its stable owner', async ({ page, request }) => {
  const scenario = await create(request); await openExample(page, scenario.id);
  await page.getByText('Record an activity', { exact: true }).click();
  await page.getByLabel('Activity ID', { exact: true }).fill('activity-added');
  await page.getByLabel('Customer ID', { exact: true }).fill('user-002');
  await page.getByLabel('Activity description', { exact: true }).fill('A second customer completes an eligible activity');
  await page.getByRole('button', { name: 'Save activity', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Activity recorded');
  await page.getByRole('button', { name: 'Run settlement', exact: true }).click();
  await expect(page.getByTestId('reward-balance')).toHaveText('20 credits');
  const result: Scenario = await (await request.get(`/api/scenarios/${scenario.id}`)).json();
  expect(result.balances).toEqual({ 'user-001': 10, 'user-002': 10 });
});

test('TC22 | browser reload preserves payment and notification recovery', async ({ page, request }) => {
  const scenario = await create(request); await fault(request, scenario.id, 'notification'); await openExample(page, scenario.id);
  await page.getByRole('button', { name: 'Run settlement', exact: true }).click();
  await expect(page.getByTestId('pending-count')).toHaveText('1'); await page.reload();
  await expect(page.getByTestId('reward-balance')).toHaveText('10 credits'); await expect(page.getByTestId('pending-count')).toHaveText('1');
  await page.getByRole('button', { name: 'Retry notifications', exact: true }).click();
  await expect(page.getByTestId('pending-count')).toHaveText('0'); await expect(page.getByTestId('payout-count')).toHaveText('1');
  await expect(page.getByTestId('reward-balance')).toHaveText('10 credits');
});

test('TC24 | narrow-screen recovery works through keyboard controls', async ({ page, request }) => {
  const scenario = await create(request); await fault(request, scenario.id, 'notification');
  await page.setViewportSize({ width: 380, height: 820 }); await openExample(page, scenario.id);
  await page.getByRole('button', { name: 'Run settlement', exact: true }).focus(); await page.keyboard.press('Enter');
  await expect(page.getByTestId('pending-count')).toHaveText('1');
  await page.getByRole('button', { name: 'Retry notifications', exact: true }).focus(); await page.keyboard.press('Enter');
  await expect(page.getByTestId('pending-count')).toHaveText('0'); await expect(page.getByTestId('reward-balance')).toHaveText('10 credits');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: 'assessment/evidence/narrow-screen.png', fullPage: true });
});

test('TC25 | a reviewed bank transfer completes once with a receipt', async ({ page }) => {
  await page.goto('/transfer'); await page.getByLabel('Amount (SGD)', { exact: true }).fill('10.00');
  await page.getByLabel('Recipient', { exact: true }).selectOption('rcp_meena');
  await page.getByLabel('Payment description', { exact: false }).fill('Dinner payment');
  await page.getByRole('button', { name: 'Review transfer', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Review your transfer', exact: true })).toBeVisible();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('mustbank.state.v1') ?? '{"transactions":[]}').transactions.length)).toBe(0);
  await page.getByRole('button', { name: 'Confirm transfer', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Transfer complete', exact: true })).toBeVisible();
  await expect(page.getByTestId('transfer-reference')).toHaveText(/^t_/);
  await expect(page.getByTestId('transfer-new-balance')).toHaveText('$472.35');
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('mustbank.state.v1')!).transactions.length)).toBe(6);
  await page.screenshot({ path: 'assessment/evidence/transfer-receipt.png', fullPage: true });
});

test('TC26 | banking screens contain product copy and no failure setup controls', async ({ page }) => {
  test.setTimeout(60000); await page.goto('/dashboard');
  for (const [link, heading] of [['Overview', 'Account overview'], ['Transfers', 'Transfer money'], ['Recipients', 'Your recipients'], ['Activity', 'Account activity'], ['Rewards', 'Your rewards']]) {
    await page.getByRole('link', { name: link, exact: true }).click();
    await expect(page.getByRole('heading', { name: heading, exact: true })).toBeVisible();
    await expect(page).toHaveTitle('MustBank | Personal banking');
    const text = await page.locator('body').innerText(); expect(text).not.toMatch(/quest|assessment|fictional|simulated|sandbox|faulty|test credits/i);
    await expect(page.getByRole('button', { name: 'Run settlement', exact: true })).toHaveCount(0);
  }
  await expect(page.getByTestId('reward-balance')).toHaveText(/credits$/);
  await page.screenshot({ path: 'assessment/evidence/customer-rewards.png', fullPage: true });
  await page.getByRole('link', { name: 'Activity', exact: true }).click();
  await page.screenshot({ path: 'assessment/evidence/mustbank-transactions.png', fullPage: true });
  await page.getByRole('link', { name: 'Overview', exact: true }).click();
  await page.screenshot({ path: 'assessment/evidence/customer-overview.png', fullPage: true });
});

test('TC27 | namespace migration preserves account balance and paid reward identity', async ({ page, request }) => {
  test.setTimeout(60000); const scenario = await create(request); await settle(request, scenario.id);
  await page.addInitScript(exampleId => {
    if (sessionStorage.getItem('migration-fixture-ready')) return;
    sessionStorage.setItem('migration-fixture-ready', 'true');
    localStorage.setItem('previousbank.quest.example.v1', exampleId);
    localStorage.setItem('previousbank.state.v1', JSON.stringify({ accounts: [{ id: 'acc_chk', nickname: 'Everyday Checking', type: 'checking', number: '4071', balance: 123_0000, currency: 'SGD' }], recipients: [], transactions: [] }));
  }, scenario.id);
  await page.goto('/rewards'); await expect(page.getByTestId('reward-balance')).toHaveText('10 credits');
  await page.goto('/operations/settlements'); await page.getByRole('button', { name: 'Run settlement', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('0 new payouts'); await expect(page.getByTestId('payout-count')).toHaveText('1');
  await page.getByRole('link', { name: 'Return to banking', exact: true }).click();
  await expect(page.getByTestId('available-balance')).toHaveText('$123.00');
  const state = await page.evaluate(() => ({ example: localStorage.getItem('mustbank.quest.example.v1'), bank: JSON.parse(localStorage.getItem('mustbank.state.v1')!), previousExample: localStorage.getItem('previousbank.quest.example.v1'), previousBank: localStorage.getItem('previousbank.state.v1') }));
  expect(state.example).toBe(scenario.id); expect(state.bank.accounts[0].balance).toBe(123_0000);
  expect(state.previousExample).toBeNull(); expect(state.previousBank).toBeNull();
});

test('TC28 | invalid amounts and insufficient balance cannot create a transfer', async ({ page }) => {
  await page.goto('/transfer');
  for (const amount of ['10abc', '0', '9999.00']) {
    await page.getByLabel('Amount (SGD)', { exact: true }).fill(amount); await page.getByRole('button', { name: 'Review transfer', exact: true }).click();
    await expect(page.getByLabel('Amount (SGD)', { exact: true })).toHaveAttribute('aria-invalid', 'true');
    await expect(page.getByRole('heading', { name: 'Review your transfer', exact: true })).toHaveCount(0);
  }
  await page.getByRole('link', { name: 'Overview', exact: true }).click(); await expect(page.getByTestId('available-balance')).toHaveText('$2,622.35');
});

test('TC29 | editing a review leaves balances untouched until confirmation', async ({ page }) => {
  await page.goto('/transfer'); await page.getByLabel('Amount (SGD)', { exact: true }).fill('10.00');
  await page.getByLabel('Recipient', { exact: true }).selectOption('rcp_meena');
  await page.getByRole('button', { name: 'Review transfer', exact: true }).click();
  await page.getByRole('button', { name: 'Edit details', exact: true }).click(); await expect(page.getByLabel('Amount (SGD)', { exact: true })).toHaveValue('10.00');
  await page.getByRole('link', { name: 'Overview', exact: true }).click(); await expect(page.getByTestId('available-balance')).toHaveText('$2,622.35');
});

test('TC30 | saved recipient search opens a transfer with the correct payee', async ({ page }) => {
  await page.goto('/recipients'); await page.getByRole('button', { name: 'Add recipient', exact: true }).click();
  await page.getByLabel('Recipient name', { exact: true }).fill('Amelia Tan'); await page.getByLabel('Account number', { exact: true }).fill('12345678');
  await page.getByLabel('Bank', { exact: true }).selectOption('DBS Bank');
  await page.getByRole('button', { name: 'Review recipient', exact: true }).click();
  await page.getByRole('button', { name: 'Save recipient', exact: true }).click(); await expect(page.getByRole('status')).toContainText('Amelia Tan');
  await page.getByLabel('Search recipients', { exact: true }).fill('Amelia');
  await page.getByRole('link', { name: 'Send money to Amelia Tan', exact: true }).click(); await expect(page.getByLabel('Recipient', { exact: true })).toContainText('Amelia Tan');
  await expect(page.getByLabel('Recipient', { exact: true })).toHaveValue(/^rcp_/);
});

test('TC31 | activity filters have a recoverable empty state', async ({ page }) => {
  await page.goto('/transactions'); await page.getByLabel('Search activity', { exact: true }).fill('not-a-recipient');
  await expect(page.getByRole('heading', { name: 'No matching activity', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Clear filters', exact: true }).click(); await expect(page.getByRole('status')).toContainText('5 transactions');
  await page.getByLabel('Status', { exact: true }).selectOption('failed'); await expect(page.getByRole('heading', { name: 'No matching activity', exact: true })).toBeVisible();
});

test('TC32 | personal rewards show only the current customer while operations reconcile all owners', async ({ page, request }) => {
  const scenario = await create(request, [TASK, { ...TASK, taskId: 'other-owner', userId: 'user-002', title: 'Other customer activity' }]);
  await settle(request, scenario.id);
  const customer = await (await request.get(`/api/scenarios/${scenario.id}/customer`)).json();
  expect(customer.totalCredits).toBe(10); expect(customer.payouts).toHaveLength(1); expect(customer.tasks).toHaveLength(1);
  expect(customer.balances).toEqual({ 'user-001': 10 }); expect(customer.mode).toBeUndefined(); expect(customer.armedFailures).toBeUndefined();
  await page.goto(`/rewards?workspace=${scenario.id}`); await expect(page.getByTestId('reward-balance')).toHaveText('10 credits');
  await expect(page.getByText('Other customer activity', { exact: true })).toHaveCount(0);
  await page.goto(`/operations/settlements?workspace=${scenario.id}`); await expect(page.getByTestId('reward-balance')).toHaveText('20 credits');
});

test('TC33 | reward statements contain personal payouts and safe CSV cells', async ({ page, request }) => {
  const scenario = await create(request, [{ ...TASK, title: '=1+1' }, { ...TASK, taskId: 'other-export', userId: 'user-002', title: 'Private other customer' }]);
  await settle(request, scenario.id); await page.goto(`/rewards?workspace=${scenario.id}`);
  await expect(page.getByTestId('reward-balance')).toHaveText('10 credits');
  const downloaded = page.waitForEvent('download'); await page.getByRole('button', { name: 'Download statement', exact: true }).click();
  const file = await downloaded; expect(file.suggestedFilename()).toBe('mustbank-rewards-statement.csv');
  const contents = await readFile((await file.path())!, 'utf8'); expect(contents).toContain("'=1+1"); expect(contents).not.toContain('Private other customer');
});

test('TC34 | customer banking remains readable at 320px with visible primary controls', async ({ page }) => {
  test.setTimeout(60000); await page.setViewportSize({ width: 320, height: 800 }); await page.goto('/dashboard');
  for (const link of ['Overview', 'Transfers', 'Recipients', 'Activity', 'Rewards']) {
    await page.getByRole('link', { name: link, exact: true }).click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  }
  await expect(page.getByTestId('reward-balance')).toHaveText(/credits$/);
  await page.screenshot({ path: 'assessment/evidence/customer-mobile-navigation.png', fullPage: true });
});
