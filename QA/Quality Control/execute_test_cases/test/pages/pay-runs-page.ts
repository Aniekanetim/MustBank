import { PayrollPage } from './payroll-page';

export class PayRunsPage extends PayrollPage {
  get reviewButton() { return this.page.getByRole('button', { name: 'Review and process payroll' }); }
  get retryButton() { return this.page.getByRole('button', { name: 'Retry pay run', exact: true }); }
  get confirmation() { return this.page.getByRole('dialog'); }
  get cancelButton() { return this.confirmation.getByRole('button', { name: 'Cancel', exact: true }); }
  get processButton() { return this.confirmation.getByRole('button', { name: 'Process payroll', exact: true }); }
  override async open() { await super.open('/pay-runs'); }
  async reviewPayroll() { await this.reviewButton.click(); }
  async confirmPayroll() { await this.processButton.click(); }
  async reviewRetry() { await this.retryButton.click(); }
  async confirmRetry() {
    await this.confirmation.getByRole('button', { name: 'Retry pay run', exact: true }).click();
  }
}
