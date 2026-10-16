import type { Page } from '@playwright/test';

// Shared navigation and period controls; business expectations stay in specs.
export class PayrollPage {
  constructor(readonly page: Page, readonly workspaceId: string) {}
  get heading() { return this.page.getByRole('heading', { level: 1 }); }
  get status() { return this.page.getByRole('status'); }
  get main() { return this.page.locator('main'); }
  get skipLink() { return this.page.getByRole('link', { name: 'Skip to content' }); }
  get payDate() { return this.page.getByRole('combobox', { name: 'Pay date', exact: true }); }
  get periodLabel() { return this.page.locator('.period-bar strong'); }
  get metrics() { return this.page.locator('.metrics'); }
  get reviewPayRunLink() { return this.page.getByRole('link', { name: 'Review pay run', exact: true }); }
  navigationLink(name: string) {
    return this.page.getByRole('navigation').getByRole('link', { name, exact: true });
  }
  metric(label: string) {
    return this.metrics.locator(':scope > div')
      .filter({ has: this.page.getByText(label, { exact: true }) }).locator('dd');
  }
  async open(route = '/overview') {
    await this.page.goto(`${route}?workspace=${encodeURIComponent(this.workspaceId)}`);
  }
  async navigate(name: string) { await this.navigationLink(name).click(); }
  async selectPayDate(date: string) { await this.payDate.selectOption(date); }
  async reload() { await this.page.reload(); }
  async visibleText() { return this.page.locator('body').innerText(); }
  async fitsViewport() {
    return this.page.evaluate(() => document.documentElement.scrollWidth <= innerWidth);
  }
}
