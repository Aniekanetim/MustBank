import { expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { test, create, run, fault, payrollSnapshot } from '../helpers';
import { PayrollPage } from '../pages/payroll-page';
import { PayRunsPage } from '../pages/pay-runs-page';
import { EarningsPage } from '../pages/earnings-page';
import { PaymentsPage } from '../pages/payments-page';
import { PaymentReceiptPage } from '../pages/payment-receipt-page';
import { EmployeesPage } from '../pages/employees-page';
import { NotificationsPage } from '../pages/notifications-page';

test('TC10 | Retrying after notification failure preserves the approved payroll', async ({ page, request, observe }, info) => {
  const w = await create(request, 'single');
  await fault(request, w.id);
  const payRuns = new PayRunsPage(page, w.id);
  await payRuns.open();
  await payRuns.reviewPayroll();
  await payRuns.confirmPayroll();
  await expect(payRuns.status).toContainText('Pay run finished');
  const first = await (await request.get(`/api/workspaces/${w.id}`)).json();
  await info.attach('first-attempt', { body: JSON.stringify(first, null, 2), contentType: 'application/json' });
  observe({ first: payrollSnapshot(first) });
  expect(first.paidMinor).toBe(15000000);
  expect(first.pendingNotifications).toBe(1);

  await payRuns.reviewRetry();
  await payRuns.confirmRetry();
  await expect(payRuns.retryButton).toBeVisible();
  const result = await (await request.get(`/api/workspaces/${w.id}`)).json();
  await info.attach('observed-workspace', { body: JSON.stringify(result, null, 2), contentType: 'application/json' });

  observe({ after: payrollSnapshot(result), paymentsUnchanged: JSON.stringify(first.payments) === JSON.stringify(result.payments), notificationIdUnchanged: first.notifications[0].id === result.notifications[0].id });
  const actual = new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' }).format(result.paidMinor / 100);
  expect(actual, 'One approved employee-period payment must remain ₦150,000.00 after recovery.').toBe('₦150,000.00');
  expect(result.payments).toHaveLength(1);
  expect(result.pendingNotifications).toBe(0);
  expect(result.payments, 'Recovery must preserve the original payment, not replace it.').toEqual(first.payments);
  expect(result.notifications[0].id).toBe(first.notifications[0].id);
});

test('TC23 | Record, approve and process earnings through the interface', async ({ page, request, observe }) => {
  const w = await create(request, 'empty');
  const earnings = new EarningsPage(page, w.id);
  const payRuns = new PayRunsPage(page, w.id);
  await earnings.open();
  await earnings.record('Approved project delivery', '150000.25');
  await expect(earnings.status).toContainText('Earnings recorded');
  await earnings.approve('Approved project delivery', 'Amara Okafor');
  await expect(earnings.status).toContainText('Earnings approved');
  await earnings.navigate('Pay runs');
  await payRuns.reviewPayroll();
  observe({ confirmationText: await payRuns.confirmation.innerText() });
  await expect(payRuns.confirmation).toContainText('₦150,000.25');
  await payRuns.confirmPayroll();
  await expect(payRuns.status).toContainText('Pay run finished');
  const result = await (await request.get(`/api/workspaces/${w.id}`)).json();
  observe({ after: payrollSnapshot(result) });
  expect(result.paidMinor).toBe(15000025);
});

test('TC24 | Cancelling payroll confirmation leaves the ledger and period unchanged', async ({ page, request, observe }) => {
  const w = await create(request);
  const payRuns = new PayRunsPage(page, w.id);
  await payRuns.open();
  await payRuns.reviewPayroll();
  await expect(payRuns.cancelButton).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(payRuns.confirmation).not.toBeVisible();
  await expect(payRuns.reviewButton).toBeFocused();
  const result = await (await request.get(`/api/workspaces/${w.id}`)).json();
  observe({ after: payrollSnapshot(result), dialogClosed: !(await payRuns.confirmation.isVisible()), triggerFocused: await payRuns.reviewButton.evaluate(element => document.activeElement === element) });
  expect(result.payments).toHaveLength(0);
  expect(result.locked).toBe(false);
});

test('TC25 | Receipt survives reload and can be copied and downloaded', async ({ page, request, context, observe }) => {
  const w = await create(request), paid = await run(request, w.id), id = paid.payments[0].id;
  const receipt = new PaymentReceiptPage(page, w.id);
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await receipt.openReceipt(id);
  await expect(receipt.heading).toHaveText('Payment receipt');
  await receipt.reload();
  await expect(receipt.reference(id)).toBeVisible();
  await receipt.copyReference();
  await expect(receipt.copyNotice).toBeVisible();
  const clipboard = await receipt.clipboardText();
  expect(clipboard).toBe(id);
  const file = await receipt.downloadReceipt();
  const downloadText = await readFile((await file.path())!, 'utf8');
  observe({ paymentId: id, referenceText: await receipt.reference(id).innerText(), clipboard, downloadText });
  expect(downloadText).toContain('Amara Okafor');
});

test('TC26 | Payment filter and CSV export contain the same employee records', async ({ page, request, observe }) => {
  const w = await create(request, 'standard');
  await run(request, w.id);
  const payments = new PaymentsPage(page, w.id);
  await payments.open();
  await payments.filterEmployee('emp-002');
  await expect(payments.rows).toHaveCount(1);
  const file = await payments.exportPayments();
  const contents = await readFile((await file.path())!, 'utf8');
  observe({ visibleRows: await payments.rows.count(), csv: contents });
  expect(contents).toContain('Daniel Mensah');
  expect(contents).not.toContain('Amara Okafor');
  expect(contents).toContain('200000.00');
});

test('TC27 | Changing pay period separates approval and payment totals', async ({ page, request, observe }) => {
  const w = await create(request, 'standard');
  await run(request, w.id);
  const overview = new PayrollPage(page, w.id);
  await overview.open();
  await expect(overview.metrics).toContainText('₦435,000.00');
  await overview.selectPayDate('2026-10-20');
  await expect(overview.periodLabel).toHaveText('12 Oct 2026 – 18 Oct 2026');
  await expect(overview.metric('Payments recorded')).toHaveText('₦0.00');
  await expect(overview.metric('Pending approvals')).toHaveText('1');
  observe({ period: await overview.periodLabel.innerText(), recordedPay: await overview.metric('Payments recorded').innerText(), pendingApprovals: await overview.metric('Pending approvals').innerText() });
});

test('TC28 | Core screens reflow at 320 pixels without page overflow', async ({ page, request, observe }) => {
  const w = await create(request, 'standard');
  await fault(request, w.id);
  await run(request, w.id);
  await page.setViewportSize({ width: 320, height: 800 });
  const payroll = new PayrollPage(page, w.id);
  const screens: Array<Record<string, unknown>> = [];
  for (const route of ['/overview', '/employees', '/employees/emp-001', '/earnings', '/pay-runs', '/payments', '/notifications']) {
    await payroll.open(route);
    await expect(payroll.heading).not.toHaveText('Loading payroll…');
    const fitsViewport = await payroll.fitsViewport();
    const bounds = await payroll.navigationLink('Pay runs').boundingBox();
    const viewport = page.viewportSize()!;
    screens.push({ route, heading: await payroll.heading.innerText(), fitsViewport, navigationInViewport: Boolean(bounds && bounds.x >= 0 && bounds.y >= 0 && bounds.x + bounds.width <= viewport.width && bounds.y + bounds.height <= viewport.height) });
    observe({ screens });
    expect(fitsViewport, route).toBe(true);
    await expect(payroll.navigationLink('Pay runs')).toBeInViewport();
  }
  await payroll.open();
  await expect(payroll.heading).toHaveText('Payroll overview');
});

test('TC29 | Keyboard navigation reaches content and payroll confirmation', async ({ page, request, observe }) => {
  const w = await create(request);
  const overview = new PayrollPage(page, w.id);
  const payRuns = new PayRunsPage(page, w.id);
  await overview.open();
  await expect(overview.heading).toHaveText('Payroll overview');
  await page.keyboard.press('Tab');
  await expect(overview.skipLink).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(overview.main).toBeFocused();
  observe({ mainFocused: await overview.main.evaluate(element => document.activeElement === element) });
  await overview.reviewPayRunLink.focus();
  await page.keyboard.press('Enter');
  await expect(payRuns.heading).toHaveText('Pay runs');
  await expect(payRuns.heading).toBeFocused();
  observe({ routeHeading: await payRuns.heading.innerText(), headingFocused: await payRuns.heading.evaluate(element => document.activeElement === element) });
  await payRuns.reviewButton.focus();
  await page.keyboard.press('Enter');
  await expect(payRuns.cancelButton).toBeFocused();
  observe({ initialDialogFocus: await payRuns.cancelButton.evaluate(element => document.activeElement === element) });
  await page.keyboard.press('Tab');
  await expect(payRuns.processButton).toBeFocused();
  observe({ processButtonFocused: await payRuns.processButton.evaluate(element => document.activeElement === element) });
  await page.keyboard.press('Escape');
  await expect(payRuns.reviewButton).toBeFocused();
  observe({ triggerFocusRestored: await payRuns.reviewButton.evaluate(element => document.activeElement === element) });
});

test('TC30 | Employee details lead to the correct earning destination', async ({ page, request, observe }) => {
  const w = await create(request);
  const employees = new EmployeesPage(page, w.id);
  const earnings = new EarningsPage(page, w.id);
  await employees.open();
  await employees.openEmployee('Daniel Mensah');
  await expect(employees.heading).toHaveText('Daniel Mensah');
  await expect(employees.bankDestination('•••• 3068')).toBeVisible();
  const employeeName = await employees.heading.innerText();
  const maskedAccount = await employees.bankDestination('•••• 3068').innerText();
  await employees.recordEarnings();
  await expect(earnings.employee).toHaveValue('emp-002');
  observe({ employeeName, maskedAccount, selectedEmployee: await earnings.employee.inputValue() });
});

test('TC31 | Payroll screens use product language and show standard totals', async ({ page, request, observe }) => {
  const w = await create(request, 'standard');
  const overview = new PayrollPage(page, w.id);
  await overview.open();
  await expect(overview.heading).toHaveText('Payroll overview');
  await expect(overview.metrics).toContainText('₦435,000.00');
  const visibleText = await overview.visibleText();
  observe({ heading: await overview.heading.innerText(), metrics: await overview.metrics.innerText(), legacyLabelsFound: visibleText.match(/Acme|MustBank|WebMCP|Quest|assessment|sandbox|fictional|test credits/gi) ?? [] });
  expect(visibleText).not.toMatch(/Acme|MustBank|WebMCP|Quest|assessment|sandbox|fictional|test credits/i);
  await overview.navigate('Employees');
});

test('TC32 | Notification recovery is visible and leaves the receipt unchanged', async ({ page, request, observe }) => {
  const w = await create(request);
  await fault(request, w.id);
  const first = await run(request, w.id);
  const notifications = new NotificationsPage(page, w.id);
  await notifications.open();
  await expect(notifications.deliveryError).toBeVisible();
  observe({ deliveryError: await notifications.deliveryError.innerText(), first: payrollSnapshot(first) });
  await notifications.retryPending();
  await expect(notifications.status).toContainText('Notification recovery finished');
  const next = await (await request.get(`/api/workspaces/${w.id}`)).json();
  observe({ after: payrollSnapshot(next), paymentsUnchanged: JSON.stringify(first.payments) === JSON.stringify(next.payments), recoveryMessage: await notifications.status.innerText() });
  expect(next.payments).toEqual(first.payments);
  expect(next.pendingNotifications).toBe(0);
  await expect(notifications.retryButton).toBeDisabled();
  observe({ retryDisabled: await notifications.retryButton.isDisabled() });
});

test('TC33 | Separate tabs retain their workspace and pay period after reload', async ({ page, request, context, observe }) => {
  const a = await create(request), b = await create(request, 'standard');
  const first = new PayrollPage(page, a.id);
  await first.open();
  await first.selectPayDate('2026-10-20');
  await expect(first.periodLabel).toHaveText('12 Oct 2026 – 18 Oct 2026');
  await first.navigate('Employees');
  await first.navigate('Overview');
  const other = await context.newPage();
  const second = new PayrollPage(other, b.id);
  await second.open();
  await expect(second.metrics).toContainText('₦435,000.00');
  await page.bringToFront();
  await first.reload();
  await expect(first.payDate).toHaveValue('2026-10-20');
  await expect(first.metric('Pending approvals')).toHaveText('0');
  observe({ firstDateAfterReload: await first.payDate.inputValue(), firstPendingApprovals: await first.metric('Pending approvals').innerText() });
  await first.selectPayDate('2026-10-13');
  await expect(first.metrics).toContainText('₦150,000.00');
  observe({ firstOriginalMetrics: await first.metrics.innerText() });
  await other.bringToFront();
  await second.reload();
  await expect(second.metrics).toContainText('₦435,000.00');
  await expect(second.payDate).toHaveValue('2026-10-13');
  observe({ secondDateAfterReload: await second.payDate.inputValue(), secondMetrics: await second.metrics.innerText() });
  await other.close();
});
