// CORRECTED IMPLEMENTATION: committed payment identity determines completion.
export const paymentPolicy = {
  name: 'fixed',
  dispatchAfterRun: true,
  wasPaid(service, id, period, employee) {
    return service.db.prepare('SELECT 1 FROM payments WHERE workspace_id=? AND period_start=? AND employee_id=?').get(id, period, employee);
  },
  afterNotification() { /* Delivery never decides whether payment exists. */ },
  commitEntry(service, { id, entry, paymentId, interrupt, savePayment, saveMessage }) {
    try {
      service.transaction(() => {
        savePayment();
        if (interrupt) throw new Error('Interrupted before notification work was saved.');
        saveMessage();
      });
      service.event(id, 'payment_committed', entry.employee_id, { paymentId, amountMinor: entry.amount_minor });
    } catch (error) {
      service.event(id, 'payment_rolled_back', entry.employee_id, { reason: error.message });
    }
  },
};
