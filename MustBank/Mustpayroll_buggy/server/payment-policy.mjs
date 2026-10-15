// CONTROLLED PRE-FIX IMPLEMENTATION: notification success determines completion.
export const paymentPolicy = {
  name: 'faulty',
  dispatchAfterRun: false,
  wasPaid(service, id, period, employee) {
    return service.db.prepare('SELECT 1 FROM processed_entries WHERE workspace_id=? AND period_start=? AND employee_id=?').get(id, period, employee);
  },
  afterNotification(service, id, message) {
    service.db.prepare('INSERT OR IGNORE INTO processed_entries VALUES(?,?,?)').run(id, message.period_start, message.employee_id);
  },
  commitEntry(service, { id, entry, paymentId, notificationId, interrupt, savePayment, saveMessage }) {
    // Defect: payment commits separately; interruption can also lose message work.
    savePayment();
    service.event(id, 'payment_committed', entry.employee_id, { paymentId, amountMinor: entry.amount_minor });
    if (!interrupt) { saveMessage(); service.deliver(id, notificationId); }
  },
};
