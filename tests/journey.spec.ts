import { test, expect, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { create, settle, TASK } from './helpers';

test.setTimeout(60000);

async function fillTransfer(page: Page, memo = 'Journey payment') {
  await page.getByLabel('Recipient', { exact: true }).selectOption('rcp_meena');
  await page.getByLabel('Amount (SGD)', { exact: true }).fill('10.00');
  await page.getByLabel('Payment description', { exact: false }).fill(memo);
}
async function pay(page: Page, memo = 'Journey payment') {
  await page.goto('/transfer'); await fillTransfer(page, memo);
  await page.getByRole('button', { name: 'Review transfer', exact: true }).click();
  await page.getByRole('button', { name: 'Confirm transfer', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Transfer complete', exact: true })).toBeVisible();
  return await page.getByTestId('transfer-reference').innerText();
}

test('TC35 | a new transfer requires an explicit recipient choice', async ({ page }) => {
  await page.goto('/transfer');
  await expect(page.getByLabel('Recipient', { exact: true })).toHaveValue('');
  await page.getByLabel('Amount (SGD)', { exact: true }).fill('10.00');
  await page.getByRole('button', { name: 'Review transfer', exact: true }).click();
  await expect(page.getByLabel('Recipient', { exact: true })).toHaveAttribute('aria-invalid', 'true');
  await expect(page.getByLabel('Recipient', { exact: true })).toBeFocused();
  await expect(page.getByRole('heading', { name: 'Review your transfer', exact: true })).toHaveCount(0);
});

test('TC36 | adding a recipient resumes the saved amount account and description', async ({ page }) => {
  await page.goto('/transfer');
  await page.getByLabel('From account', { exact: true }).selectOption('acc_sav');
  await page.getByLabel('Amount (SGD)', { exact: true }).fill('175.00');
  await page.getByLabel('Payment description', { exact: false }).fill('School fees');
  await page.getByRole('link', { name: 'Add a new recipient', exact: true }).click();
  await page.getByLabel('Recipient name', { exact: true }).fill('Harbour School');
  await page.getByLabel('Bank', { exact: true }).selectOption('OCBC');
  await page.getByLabel('Account number', { exact: true }).fill('1234567890');
  await page.getByRole('button', { name: 'Review recipient', exact: true }).click();
  await expect(page.getByText('1234567890', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Save recipient', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Transfer money', exact: true })).toBeVisible();
  await expect(page.getByLabel('Recipient', { exact: true }).locator('option:checked')).toContainText('Harbour School');
  await expect(page.getByLabel('From account', { exact: true })).toHaveValue('acc_sav');
  await expect(page.getByLabel('Amount (SGD)', { exact: true })).toHaveValue('175.00');
  await expect(page.getByLabel('Payment description', { exact: false })).toHaveValue('School fees');
  await page.reload();
  await expect(page.getByLabel('Amount (SGD)', { exact: true })).toHaveValue('175.00');
  await page.getByRole('button', { name: 'Review transfer', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Review your transfer', exact: true })).toBeVisible();
  await page.screenshot({ path: 'assessment/evidence/transfer-review.png', fullPage: true });
});

test('TC37 | cancelling recipient creation and cancelling discard preserve the draft', async ({ page }) => {
  await page.goto('/transfer'); await fillTransfer(page, 'Keep this description');
  await page.getByRole('link', { name: 'Add a new recipient', exact: true }).click();
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(page.getByLabel('Recipient', { exact: true })).toHaveValue('rcp_meena');
  await expect(page.getByLabel('Payment description', { exact: false })).toHaveValue('Keep this description');
  await page.getByRole('button', { name: 'Discard draft', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible(); await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await expect(page.getByRole('button', { name: 'Discard draft', exact: true })).toBeFocused();
  await expect(page.getByLabel('Amount (SGD)', { exact: true })).toHaveValue('10.00');
  await page.getByRole('button', { name: 'Discard draft', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Discard draft', exact: true }).click();
  await expect(page.getByLabel('Recipient', { exact: true })).toHaveValue('');
  await expect(page.getByLabel('Amount (SGD)', { exact: true })).toHaveValue('');
  await page.reload(); await expect(page.getByLabel('Amount (SGD)', { exact: true })).toHaveValue('');
});

test('TC38 | receipts survive navigation and reload and can be copied and downloaded', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  const reference = await pay(page, 'Proof payment');
  await page.getByRole('link', { name: 'View activity', exact: true }).click();
  await page.getByRole('link', { name: 'View payment details for Proof payment', exact: true }).click();
  await page.reload(); await expect(page.getByTestId('transfer-reference')).toHaveText(reference);
  await expect(page.getByTestId('transfer-new-balance')).toHaveText('$472.35');
  await page.getByRole('button', { name: 'Copy reference', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('Reference copied.');
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(reference);
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download receipt', exact: true }).click();
  const file = await download; expect(file.suggestedFilename()).toBe(`mustbank-receipt-${reference}.txt`);
  const contents = await readFile((await file.path())!, 'utf8');
  expect(contents).toContain(reference); expect(contents).toContain('Meena Iyer'); expect(contents).toContain('Date (UTC):'); expect(contents).toContain('Proof payment');
});

test('TC39 | reviewed recipient edits cannot rewrite an earlier receipt', async ({ page }) => {
  const reference = await pay(page, 'Original payee');
  await page.getByRole('link', { name: 'Recipients', exact: true }).click();
  await page.getByRole('link', { name: 'Manage Meena Iyer', exact: true }).click();
  await page.getByRole('button', { name: 'Edit recipient', exact: true }).click();
  await page.getByLabel('Recipient name', { exact: true }).fill('Meena Rao');
  await page.getByLabel('Bank', { exact: true }).selectOption('OCBC');
  await page.getByLabel('Account number', { exact: true }).fill('9876543210');
  await page.getByRole('button', { name: 'Review changes', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Review recipient changes', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Save changes', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Meena Rao', exact: true })).toBeVisible();
  await page.goto(`/transactions/${reference}`);
  await expect(page.getByRole('heading', { name: 'Payment details', exact: true })).toBeVisible();
  await expect(page.getByText('DBS Bank · Account ending 5621', { exact: true })).toBeVisible();
  await expect(page.getByText('Meena Rao', { exact: true })).toHaveCount(0);
  await expect(page.getByTestId('transfer-new-balance')).toHaveText('$472.35');
});

test('TC40 | removing a recipient requires confirmation and keeps historical payments', async ({ page }) => {
  await page.goto('/recipients'); await page.getByRole('link', { name: 'Manage Meena Iyer', exact: true }).click();
  await page.getByRole('button', { name: 'Remove recipient', exact: true }).click(); await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await page.getByRole('button', { name: 'Remove recipient', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Remove recipient', exact: true }).click();
  await expect(page.getByRole('link', { name: 'Manage Meena Iyer', exact: true })).toHaveCount(0);
  await page.goto('/transfer'); await expect(page.getByLabel('Recipient', { exact: true }).locator('option')).not.toContainText(['Meena Iyer']);
  await page.goto('/transactions/t_2');
  await expect(page.getByRole('heading', { name: 'Payment details', exact: true })).toBeVisible();
  await expect(page.getByText('DBS Bank · Account ending 5621', { exact: true })).toBeVisible();
});

test('TC41 | internal transfers show account-specific direction and keep filters on return', async ({ page }) => {
  await page.goto('/transactions?account=acc_sav');
  const row = page.getByRole('row').filter({ hasText: 'Top up checking' });
  await expect(row).toContainText('−$500.00'); await expect(row).toContainText('Money out');
  await page.getByRole('link', { name: 'View payment details for Top up checking', exact: true }).click();
  await page.getByRole('link', { name: 'Back to activity', exact: true }).click();
  await expect(page.getByLabel('Account', { exact: true })).toHaveValue('acc_sav');
  await page.getByLabel('Account', { exact: true }).selectOption('acc_chk');
  await expect(page.getByRole('row').filter({ hasText: 'Top up checking' })).toContainText('+$500.00');
  await expect(page.getByRole('row').filter({ hasText: 'Top up checking' })).toContainText('Money in');
});

test('TC42 | rewards explain credit limits and distinguish overdue and next-week payments', async ({ page, request }) => {
  await page.clock.setFixedTime(new Date('2026-10-15T12:00:00Z'));
  const scenario = await create(request, [TASK, { ...TASK, taskId: 'next-week', title: 'Direct debit enrolment', completedAt: '2026-10-12T00:00:00Z' }]);
  await page.goto(`/rewards?workspace=${scenario.id}`);
  await expect(page.getByRole('heading', { name: 'Reward payment delayed', exact: true })).toBeVisible();
  await expect(page.getByRole('region', { name: 'Reward balances', exact: true })).toContainText('20 credits');
  await expect(page.getByRole('row').filter({ hasText: 'Direct debit enrolment' })).toContainText('Scheduled');
  await expect(page.getByRole('row').filter({ hasText: 'Direct debit enrolment' })).toContainText('20 Oct 2026');
  await expect(page.getByText('Reward credits are program points, separate from your SGD account balances. Cash conversion and redemption are not available in this rewards program.', { exact: true })).toBeVisible();
  await expect(page.locator('body')).not.toContainText('Current period:');
  await settle(request, scenario.id); await page.getByRole('button', { name: 'Refresh', exact: true }).click();
  await expect(page.getByTestId('reward-balance')).toHaveText('10 credits');
  await expect(page.getByRole('heading', { name: 'Next reward payment', exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Overview', exact: true }).click();
  await expect(page.getByTestId('available-balance')).toHaveText('$2,622.35');
});

test('TC43 | mobile rewards prioritise activities and transfer actions stay above navigation', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 }); await page.goto('/rewards');
  await expect(page.getByTestId('reward-balance')).toHaveText('0 credits');
  const activity = await page.locator('.reward-activities-table tbody tr:first-child strong').boundingBox();
  const menu = await page.getByRole('navigation', { name: 'Personal banking', exact: true }).boundingBox();
  expect(activity!.y + activity!.height).toBeLessThan(menu!.y);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(320);
  await page.screenshot({ path: 'assessment/evidence/customer-mobile.png', fullPage: false });
  await page.getByRole('link', { name: 'Transfers', exact: true }).click(); await fillTransfer(page);
  await page.getByRole('button', { name: 'Review transfer', exact: true }).click();
  const confirm = page.getByRole('button', { name: 'Confirm transfer', exact: true }); await confirm.scrollIntoViewIfNeeded();
  const button = await confirm.boundingBox(); const navigation = await page.getByRole('navigation', { name: 'Personal banking', exact: true }).boundingBox();
  expect(button!.y + button!.height).toBeLessThanOrEqual(navigation!.y);
  await page.screenshot({ path: 'assessment/evidence/transfer-mobile-review.png', fullPage: true });
});

test('TC44 | transfer review edit and confirmation work through keyboard controls', async ({ page }) => {
  await page.goto('/transfer'); await page.getByLabel('Recipient', { exact: true }).focus(); await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Tab'); await page.keyboard.press('Tab'); await page.keyboard.type('10.00');
  await page.keyboard.press('Tab'); await page.keyboard.type('Keyboard payment');
  await page.keyboard.press('Tab'); await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Review your transfer', exact: true })).toBeFocused();
  await page.keyboard.press('Tab'); await expect(page.getByRole('button', { name: 'Edit details', exact: true })).toBeFocused();
  await page.keyboard.press('Enter'); await page.keyboard.press('Tab'); await expect(page.getByLabel('From account', { exact: true })).toBeFocused();
  await page.getByRole('button', { name: 'Review transfer', exact: true }).focus(); await page.keyboard.press('Enter');
  await page.keyboard.press('Tab'); await page.keyboard.press('Tab'); await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Transfer complete', exact: true })).toBeFocused();
});

test('TC45 | receipt history navigation and reload do not repeat a payment', async ({ page }) => {
  await page.goto('/dashboard'); await page.getByRole('link', { name: 'Make a transfer', exact: true }).click(); await fillTransfer(page);
  await page.getByRole('button', { name: 'Review transfer', exact: true }).click(); await page.getByRole('button', { name: 'Confirm transfer', exact: true }).click();
  const reference = await page.getByTestId('transfer-reference').innerText();
  await page.goBack(); await expect(page.getByRole('heading', { name: 'Account overview', exact: true })).toBeVisible();
  await page.goForward(); await page.reload(); await expect(page.getByTestId('transfer-reference')).toHaveText(reference);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('mustbank.state.v1')!).transactions.length)).toBe(6);
  await page.getByRole('link', { name: 'Make another transfer', exact: true }).click();
  await expect(page.getByLabel('Recipient', { exact: true })).toHaveValue(''); await expect(page.getByLabel('Amount (SGD)', { exact: true })).toHaveValue('');
});

test('TC46 | recipient changes in another tab require a fresh destination choice', async ({ page, context }) => {
  await page.goto('/transfer'); await fillTransfer(page, 'Preserve my intent');
  await page.getByRole('button', { name: 'Review transfer', exact: true }).click();
  const other = await context.newPage(); await other.goto('/recipients/rcp_meena');
  await other.getByRole('button', { name: 'Edit recipient', exact: true }).click();
  await other.getByLabel('Recipient name', { exact: true }).fill('Meena Rao');
  await other.getByRole('button', { name: 'Review changes', exact: true }).click();
  await other.getByRole('button', { name: 'Save changes', exact: true }).click();
  await page.bringToFront();
  await other.close();
  await expect(page.getByRole('status')).toContainText('Choose a recipient again');
  await expect(page.getByLabel('Recipient', { exact: true })).toHaveValue('');
  await expect(page.getByLabel('Amount (SGD)', { exact: true })).toHaveValue('10.00');
  await expect(page.getByLabel('Payment description', { exact: false })).toHaveValue('Preserve my intent');
  await expect(page.getByRole('heading', { name: 'Review your transfer', exact: true })).toHaveCount(0);
});
