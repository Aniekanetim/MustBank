import { PayrollPage } from './payroll-page';

export class PaymentsPage extends PayrollPage {
  get rows() { return this.page.locator('tbody tr'); }
  override async open() { await super.open('/payments'); }
  async filterEmployee(employeeId: string) {
    await this.page.getByRole('combobox', { name: 'Employee', exact: true }).selectOption(employeeId);
  }
  async exportPayments() {
    const download = this.page.waitForEvent('download');
    await this.page.getByRole('button', { name: 'Export payments' }).click();
    return download;
  }
}
