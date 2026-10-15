import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { create, run, fault } from './helpers';

test('TC10 | Retrying after notification failure preserves the approved payroll', async ({ page, request }, info) => {
  const w = await create(request, 'single'); await fault(request, w.id);
  await page.goto(`/pay-runs?workspace=${w.id}`);
  await page.getByRole('button', { name: 'Review and process payroll' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Process payroll', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Pay run finished');
  const first = await (await request.get(`/api/workspaces/${w.id}`)).json();
  await info.attach('first-attempt', { body: JSON.stringify(first, null, 2), contentType: 'application/json' });
  expect(first.paidMinor).toBe(15000000); expect(first.pendingNotifications).toBe(1);
  await page.getByRole('button', { name: 'Retry pay run', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Retry pay run', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Retry pay run', exact: true })).toBeVisible();
  const result = await (await request.get(`/api/workspaces/${w.id}`)).json();
  await info.attach('observed-workspace', { body: JSON.stringify(result, null, 2), contentType: 'application/json' });

  const actual = new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(result.paidMinor / 100);
  expect(actual, 'One approved employee-period payment must remain ₦150,000.00 after recovery.').toBe('₦150,000.00');
  expect(result.payments).toHaveLength(1); expect(result.pendingNotifications).toBe(0);
  expect(result.payments, 'Recovery must preserve the original payment, not replace it.').toEqual(first.payments);
  expect(result.notifications[0].id).toBe(first.notifications[0].id);
});
test('TC23 | Record, approve and process earnings through the interface', async ({ page, request }) => {
  const w = await create(request, 'empty'); await page.goto(`/earnings?workspace=${w.id}`);
  await page.getByLabel('Description', { exact: true }).fill('Approved project delivery');
  await page.getByLabel('Amount (NGN)').fill('150000.25'); await page.getByRole('button', { name: 'Record earnings', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Earnings recorded');
  await page.getByRole('button', { name: 'Approve Approved project delivery for Amara Okafor' }).click();
  await expect(page.getByRole('status')).toContainText('Earnings approved');
  await page.getByRole('navigation').getByRole('link', { name: 'Pay runs', exact: true }).click();
  await page.getByRole('button', { name: 'Review and process payroll' }).click();
  await expect(page.getByRole('dialog')).toContainText('₦150,000.25');
  await page.getByRole('dialog').getByRole('button', { name: 'Process payroll', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Pay run finished');
  const result = await (await request.get(`/api/workspaces/${w.id}`)).json(); expect(result.paidMinor).toBe(15000025);

});
test('TC24 | Cancelling payroll confirmation leaves the ledger and period unchanged', async ({ page, request }) => {
  const w = await create(request); await page.goto(`/pay-runs?workspace=${w.id}`);
  const trigger = page.getByRole('button', { name: 'Review and process payroll' }); await trigger.click();
  await expect(page.getByRole('dialog').getByRole('button', { name: 'Cancel', exact: true })).toBeFocused();
  await page.keyboard.press('Escape'); await expect(page.getByRole('dialog')).not.toBeVisible(); await expect(trigger).toBeFocused();
  const result = await (await request.get(`/api/workspaces/${w.id}`)).json(); expect(result.payments).toHaveLength(0); expect(result.locked).toBe(false);
});
test('TC25 | Receipt survives reload and can be copied and downloaded', async ({ page, request, context }) => {
  const w = await create(request), paid = await run(request, w.id), id = paid.payments[0].id;
  await context.grantPermissions(['clipboard-read', 'clipboard-write']); await page.goto(`/payments/${id}?workspace=${w.id}`);
  await expect(page.getByRole('heading', { name: 'Payment receipt' })).toBeVisible(); await page.reload();
  await expect(page.getByText(id, { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Copy reference' }).click(); await expect(page.getByRole('status').filter({ hasText: 'Reference copied.' })).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(id);
  const download = page.waitForEvent('download'); await page.getByRole('button', { name: 'Download receipt' }).click(); const file = await download;
  expect(await readFile((await file.path())!, 'utf8')).toContain('Amara Okafor');

});
test('TC26 | Payment filter and CSV export contain the same employee records', async ({ page, request }) => {
  const w = await create(request, 'standard'); await run(request, w.id); await page.goto(`/payments?workspace=${w.id}`);
  await page.getByRole('combobox', { name: 'Employee', exact: true }).selectOption('emp-002'); await expect(page.locator('tbody tr')).toHaveCount(1);
  const download = page.waitForEvent('download'); await page.getByRole('button', { name: 'Export payments' }).click();
  const contents = await readFile((await (await download).path())!, 'utf8'); expect(contents).toContain('Daniel Mensah'); expect(contents).not.toContain('Amara Okafor'); expect(contents).toContain('200000.00');
});
test('TC27 | Changing pay period separates approval and payment totals', async ({ page, request }) => {
  const w = await create(request, 'standard'); await run(request, w.id); await page.goto(`/overview?workspace=${w.id}`);
  await expect(page.locator('.metrics')).toContainText('₦435,000.00'); await page.getByRole('combobox', { name: 'Pay date', exact: true }).selectOption('2026-10-20');
  await expect(page.getByText('12 Oct 2026 – 18 Oct 2026', { exact: true })).toBeVisible();
  await expect(page.locator('.metrics>div').filter({ has: page.getByText('Payments recorded', { exact: true }) }).locator('dd')).toHaveText('₦0.00');
  await expect(page.locator('.metrics>div').filter({ has: page.getByText('Pending approvals', { exact: true }) }).locator('dd')).toHaveText('1');
});
test('TC28 | Core screens reflow at 320 pixels without page overflow', async ({ page, request }) => {
  const w = await create(request, 'standard'); await fault(request, w.id); await run(request, w.id); await page.setViewportSize({ width: 320, height: 800 });
  for (const route of ['/overview', '/employees', '/employees/emp-001', '/earnings', '/pay-runs', '/payments', '/notifications']) {
    await page.goto(`${route}?workspace=${w.id}`); await expect(page.getByRole('heading', { level: 1 })).not.toHaveText('Loading payroll…');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), route).toBe(true);
    await expect(page.getByRole('navigation').getByRole('link', { name: 'Pay runs', exact: true })).toBeInViewport();
  }
  await page.goto(`/overview?workspace=${w.id}`); await expect(page.getByRole('heading', { name: 'Payroll overview' })).toBeVisible();

});
test('TC29 | Keyboard navigation reaches content and payroll confirmation', async ({ page, request }) => {
  const w = await create(request); await page.goto(`/overview?workspace=${w.id}`); await expect(page.getByRole('heading', { name: 'Payroll overview' })).toBeVisible();
  await page.keyboard.press('Tab'); await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused(); await page.keyboard.press('Enter');
  await expect(page.locator('main')).toBeFocused();
  await page.getByRole('link', { name: 'Review pay run', exact: true }).focus(); await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Pay runs', exact: true })).toBeFocused();
  await page.getByRole('button', { name: 'Review and process payroll' }).focus(); await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog').getByRole('button', { name: 'Cancel', exact: true })).toBeFocused();
  await page.keyboard.press('Tab'); await expect(page.getByRole('dialog').getByRole('button', { name: 'Process payroll', exact: true })).toBeFocused();
  await page.keyboard.press('Escape'); await expect(page.getByRole('button', { name: 'Review and process payroll' })).toBeFocused();
});
test('TC30 | Employee details lead to the correct earning destination', async ({ page, request }) => {
  const w = await create(request); await page.goto(`/employees?workspace=${w.id}`); await page.getByRole('link', { name: /Daniel Mensah/ }).click();
  await expect(page.getByRole('heading', { name: 'Daniel Mensah' })).toBeVisible(); await expect(page.getByText('•••• 3068', { exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Record earnings', exact: true }).click(); await expect(page.getByRole('combobox', { name: 'Employee', exact: true })).toHaveValue('emp-002');
});
test('TC31 | Payroll screens use product language and show standard totals', async ({ page, request }) => {
  const w = await create(request, 'standard'); await page.goto(`/overview?workspace=${w.id}`);
  await expect(page.getByRole('heading', { name: 'Payroll overview' })).toBeVisible(); await expect(page.locator('.metrics')).toContainText('₦435,000.00');
  expect(await page.locator('body').innerText()).not.toMatch(/Acme|MustBank|WebMCP|Quest|assessment|sandbox|fictional|test credits/i);

  await page.getByRole('navigation').getByRole('link', { name: 'Employees', exact: true }).click();
});
test('TC32 | Notification recovery is visible and leaves the receipt unchanged', async ({ page, request }) => {
  const w = await create(request); await fault(request, w.id); const first = await run(request, w.id);
  await page.goto(`/notifications?workspace=${w.id}`); await expect(page.getByText('Notification delivery unavailable. Retry the notification.')).toBeVisible();

  await page.getByRole('button', { name: 'Retry pending notifications' }).click(); await expect(page.getByRole('status')).toContainText('Notification recovery finished');
  const next = await (await request.get(`/api/workspaces/${w.id}`)).json(); expect(next.payments).toEqual(first.payments); expect(next.pendingNotifications).toBe(0);
  await expect(page.getByRole('button', { name: 'Retry pending notifications' })).toBeDisabled();
});
test('TC33 | Separate tabs retain their workspace and pay period after reload', async ({ page, request, context }) => {
  const a = await create(request), b = await create(request, 'standard');
  await page.goto(`/overview?workspace=${a.id}`);
  await page.getByRole('combobox', { name: 'Pay date', exact: true }).selectOption('2026-10-20');
  await expect(page.getByText('12 Oct 2026 – 18 Oct 2026', { exact: true })).toBeVisible();
  await page.getByRole('navigation').getByRole('link', { name: 'Employees', exact: true }).click();
  await page.getByRole('navigation').getByRole('link', { name: 'Overview', exact: true }).click();
  const other = await context.newPage(); await other.goto(`/overview?workspace=${b.id}`);
  await expect(other.locator('.metrics')).toContainText('₦435,000.00');
  await page.bringToFront(); await page.reload();
  await expect(page.getByRole('combobox', { name: 'Pay date', exact: true })).toHaveValue('2026-10-20');
  await expect(page.locator('.metrics>div').filter({ has: page.getByText('Pending approvals', { exact: true }) }).locator('dd')).toHaveText('0');
  await page.getByRole('combobox', { name: 'Pay date', exact: true }).selectOption('2026-10-13');
  await expect(page.locator('.metrics')).toContainText('₦150,000.00');
  await other.bringToFront(); await other.reload(); await expect(other.locator('.metrics')).toContainText('₦435,000.00');
  await expect(other.getByRole('combobox', { name: 'Pay date', exact: true })).toHaveValue('2026-10-13');
  await other.close();
});
