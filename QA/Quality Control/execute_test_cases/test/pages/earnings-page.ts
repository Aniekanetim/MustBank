import { PayrollPage } from './payroll-page';

export class EarningsPage extends PayrollPage {
  get employee() { return this.page.getByRole('combobox', { name: 'Employee', exact: true }); }
  override async open() { await super.open('/earnings'); }
  async record(description: string, amount: string) {
    await this.page.getByLabel('Description', { exact: true }).fill(description);
    await this.page.getByLabel('Amount (NGN)').fill(amount);
    await this.page.getByRole('button', { name: 'Record earnings', exact: true }).click();
  }
  async approve(description: string, employeeName: string) {
    await this.page.getByRole('button', { name: `Approve ${description} for ${employeeName}` }).click();
  }
}
