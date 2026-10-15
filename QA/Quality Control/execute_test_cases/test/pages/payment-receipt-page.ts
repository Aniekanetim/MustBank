import { PayrollPage } from './payroll-page';

export class PaymentReceiptPage extends PayrollPage {
  reference(paymentId: string) { return this.page.getByText(paymentId, { exact: true }); }
  get copyNotice() { return this.status.filter({ hasText: 'Reference copied.' }); }
  async openReceipt(paymentId: string) { await super.open(`/payments/${encodeURIComponent(paymentId)}`); }
  async copyReference() { await this.page.getByRole('button', { name: 'Copy reference' }).click(); }
  async clipboardText() { return this.page.evaluate(() => navigator.clipboard.readText()); }
  async downloadReceipt() {
    const download = this.page.waitForEvent('download');
    await this.page.getByRole('button', { name: 'Download receipt' }).click();
    return download;
  }
}
