import { PayrollPage } from './payroll-page';

export class NotificationsPage extends PayrollPage {
  get deliveryError() { return this.page.getByText('Notification delivery unavailable. Retry the notification.'); }
  get retryButton() { return this.page.getByRole('button', { name: 'Retry pending notifications' }); }
  override async open() { await super.open('/notifications'); }
  async retryPending() { await this.retryButton.click(); }
}
