import { PayrollPage } from './payroll-page';

export class EmployeesPage extends PayrollPage {
  override async open() { await super.open('/employees'); }
  async openEmployee(name: string) { await this.page.getByRole('link', { name: new RegExp(name) }).click(); }
  bankDestination(maskedAccount: string) { return this.page.getByText(maskedAccount, { exact: true }); }
  async recordEarnings() { await this.page.getByRole('link', { name: 'Record earnings', exact: true }).click(); }
}
