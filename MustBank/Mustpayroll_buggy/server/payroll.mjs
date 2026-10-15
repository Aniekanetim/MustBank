import { randomUUID } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { paymentPolicy } from './payment-policy.mjs';
export const BUILD_VARIANT = paymentPolicy.name;

export const DEFAULT_RUN = '2026-10-13T09:00:00.000Z';
export class InputError extends Error {
  constructor(message, status = 400) { super(message); this.status = status; }
}
export function timestamp(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(value)) throw new InputError('Use a timestamp with Z or an explicit UTC offset.');
  const [y, m, d] = value.slice(0, 10).split('-').map(Number);
  const [h, min, s] = value.slice(11, 19).split(':').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  if (h > 23 || min > 59 || s > 59 || date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d || !Number.isFinite(Date.parse(value))) throw new InputError('Use a valid calendar date and time.');
  return new Date(value).toISOString();
}
export function payPeriod(value) {
  const scheduledFor = timestamp(value);
  const run = new Date(scheduledFor);
  if (run.getUTCDay() !== 2 || run.getUTCHours() !== 9 || run.getUTCMinutes() || run.getUTCSeconds() || run.getUTCMilliseconds()) throw new InputError('Use the original Tuesday 09:00 UTC pay date, including on retries.');
  const end = Date.UTC(run.getUTCFullYear(), run.getUTCMonth(), run.getUTCDate() - 1);
  return { scheduledFor, start: new Date(end - 604800000).toISOString(), end: new Date(end).toISOString() };
}
const EMPLOYEES = [
  { id: 'emp-001', name: 'Amara Okafor', role: 'Product designer', department: 'Design', bank: 'Meridian Bank', accountEnding: '4821' },
  { id: 'emp-002', name: 'Daniel Mensah', role: 'Software engineer', department: 'Engineering', bank: 'Union Coast Bank', accountEnding: '3068' },
  { id: 'emp-003', name: 'Zara Bello', role: 'Operations associate', department: 'Operations', bank: 'Meridian Bank', accountEnding: '7290' },
];
export const SINGLE_EARNING = { earningId: 'earn-001', employeeId: 'emp-001', description: 'Weekly project earnings', earnedAt: '2026-10-08T12:00:00Z', amountMinor: 15000000, status: 'approved' };
const STANDARD = [
  { ...SINGLE_EARNING, amountMinor: 12000000 },
  { earningId: 'earn-002', employeeId: 'emp-001', description: 'Approved delivery bonus', earnedAt: '2026-10-09T15:00:00Z', amountMinor: 3000000, status: 'approved' },
  { earningId: 'earn-003', employeeId: 'emp-002', description: 'Weekly project earnings', earnedAt: '2026-10-09T12:00:00Z', amountMinor: 20000000, status: 'approved' },
  { earningId: 'earn-004', employeeId: 'emp-003', description: 'Weekly project earnings', earnedAt: '2026-10-10T12:00:00Z', amountMinor: 8500000, status: 'approved' },
  { earningId: 'earn-005', employeeId: 'emp-003', description: 'Next period project earnings', earnedAt: '2026-10-12T08:00:00Z', amountMinor: 8500000, status: 'pending' },
];
const BOUNDARIES = [
  { ...SINGLE_EARNING, earningId: 'start', earnedAt: '2026-10-05T00:00:00Z', amountMinor: 1000000 },
  { ...SINGLE_EARNING, earningId: 'before', earnedAt: '2026-10-05T00:30:00+01:00', amountMinor: 2000000 },
  { ...SINGLE_EARNING, earningId: 'last', earnedAt: '2026-10-11T23:59:59Z', amountMinor: 3000000 },
  { ...SINGLE_EARNING, earningId: 'end', earnedAt: '2026-10-12T00:00:00Z', amountMinor: 4000000 },
];
export class PayrollService {
  constructor(path) {
    this.db = new DatabaseSync(path);
    this.db.exec(`PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;
      CREATE TABLE IF NOT EXISTS workspaces (id TEXT PRIMARY KEY, behavior TEXT NOT NULL, created_at TEXT NOT NULL,
        notification_fault INTEGER DEFAULT 0, payout_fault INTEGER DEFAULT 0, persistence_fault INTEGER DEFAULT 0, ambiguous_fault INTEGER DEFAULT 0);
      CREATE TABLE IF NOT EXISTS employees (workspace_id TEXT REFERENCES workspaces(id), id TEXT, name TEXT, role TEXT, department TEXT, bank TEXT, account_ending TEXT, PRIMARY KEY(workspace_id,id));
      CREATE TABLE IF NOT EXISTS earnings (workspace_id TEXT REFERENCES workspaces(id), id TEXT, employee_id TEXT, description TEXT, earned_at TEXT, amount_minor INTEGER CHECK(amount_minor > 0), status TEXT, PRIMARY KEY(workspace_id,id));
      CREATE TABLE IF NOT EXISTS pay_runs (workspace_id TEXT REFERENCES workspaces(id), period_start TEXT, period_end TEXT, scheduled_for TEXT, created_at TEXT, PRIMARY KEY(workspace_id,period_start));
      CREATE TABLE IF NOT EXISTS run_entries (workspace_id TEXT, period_start TEXT, employee_id TEXT, amount_minor INTEGER, earning_ids TEXT, PRIMARY KEY(workspace_id,period_start,employee_id));
      CREATE TABLE IF NOT EXISTS payments (id TEXT PRIMARY KEY, workspace_id TEXT REFERENCES workspaces(id), period_start TEXT, employee_id TEXT, amount_minor INTEGER CHECK(amount_minor > 0), behavior TEXT, employee_name TEXT, bank TEXT, account_ending TEXT, created_at TEXT);
      CREATE UNIQUE INDEX IF NOT EXISTS one_fixed_payment ON payments(workspace_id,period_start,employee_id) WHERE behavior='fixed';
      CREATE TABLE IF NOT EXISTS notifications (id TEXT PRIMARY KEY, payment_id TEXT UNIQUE REFERENCES payments(id), state TEXT DEFAULT 'pending', attempts INTEGER DEFAULT 0, last_error TEXT);
      CREATE TABLE IF NOT EXISTS processed_entries (workspace_id TEXT, period_start TEXT, employee_id TEXT, PRIMARY KEY(workspace_id,period_start,employee_id));
      CREATE TABLE IF NOT EXISTS provider_receipts (workspace_id TEXT, period_start TEXT, employee_id TEXT, accepted_at TEXT, PRIMARY KEY(workspace_id,period_start,employee_id));
      CREATE TABLE IF NOT EXISTS events (id INTEGER PRIMARY KEY AUTOINCREMENT, workspace_id TEXT, event TEXT, employee_id TEXT, detail TEXT, created_at TEXT);`);
  }
  close() { this.db.close(); }
  workspace(id) {
    const row = this.db.prepare('SELECT * FROM workspaces WHERE id=?').get(id);
    if (!row) throw new InputError('Workspace not found. Open an existing workspace or return to the overview.', 404);
    if (row.behavior !== BUILD_VARIANT) throw new InputError('This workspace belongs to the other build. Open it in the matching application.', 409);
    return row;
  }
  transaction(work) {
    this.db.exec('BEGIN IMMEDIATE');
    try { const result = work(); this.db.exec('COMMIT'); return result; }
    catch (error) { this.db.exec('ROLLBACK'); throw error; }
  }
  event(id, event, employeeId = null, detail = {}) {
    this.db.prepare('INSERT INTO events(workspace_id,event,employee_id,detail,created_at) VALUES(?,?,?,?,?)').run(id, event, employeeId, JSON.stringify(detail), new Date().toISOString());
  }
  create({ behavior = BUILD_VARIANT, fixture = 'standard' } = {}) {
    if (behavior !== BUILD_VARIANT) throw new InputError('This build has a fixed implementation. Use the other build for that behavior.');
    if (!['standard', 'single', 'boundaries', 'empty'].includes(fixture)) throw new InputError('Choose a supported starting fixture.');
    const id = randomUUID();
    this.transaction(() => {
      this.db.prepare('INSERT INTO workspaces(id,behavior,created_at) VALUES(?,?,?)').run(id, behavior, new Date().toISOString());
      for (const e of EMPLOYEES) this.db.prepare('INSERT INTO employees VALUES(?,?,?,?,?,?,?)').run(id, e.id, e.name, e.role, e.department, e.bank, e.accountEnding);
    });
    this.addEarnings(id, fixture === 'standard' ? STANDARD : fixture === 'single' ? [SINGLE_EARNING] : fixture === 'boundaries' ? BOUNDARIES : []);
    return this.snapshot(id);
  }
  addEarnings(id, inputs) {
    this.workspace(id);
    if (!Array.isArray(inputs) || inputs.length > 256) throw new InputError('Supply up to 256 earning records.');
    this.transaction(() => {
      for (const input of inputs) {
        if (!input || !['earningId', 'employeeId'].every(k => typeof input[k] === 'string' && /^[a-zA-Z0-9_-]{1,64}$/.test(input[k]))) throw new InputError('Earning and employee IDs must use 1–64 letters, numbers, underscores or hyphens.');
        if (!this.db.prepare('SELECT 1 FROM employees WHERE workspace_id=? AND id=?').get(id, input.employeeId)) throw new InputError('Select an employee in this workspace.');
        if (!Number.isSafeInteger(input.amountMinor) || input.amountMinor <= 0 || input.amountMinor > 100000000) throw new InputError('Enter an amount from ₦0.01 to ₦1,000,000.00, in whole kobo.');
        const earnedAt = timestamp(input.earnedAt), status = input.status ?? 'pending';
        if (!['approved', 'pending', 'rejected'].includes(status)) throw new InputError('Use approved, pending or rejected earnings.');
        const description = typeof input.description === 'string' ? input.description.trim().slice(0, 160) : '';
        if (!description) throw new InputError('Describe the earnings.');
        const existing = this.db.prepare('SELECT * FROM earnings WHERE workspace_id=? AND id=?').get(id, input.earningId);
        if (existing) {
          if (existing.employee_id !== input.employeeId || existing.earned_at !== earnedAt || existing.amount_minor !== input.amountMinor || existing.status !== status || existing.description !== description) throw new InputError('An existing earning ID cannot change. Import the original record or use a new ID.', 409);
          continue;
        }
        if (this.db.prepare('SELECT 1 FROM pay_runs WHERE workspace_id=? AND period_start<=? AND period_end>?').get(id, earnedAt, earnedAt)) throw new InputError('This pay period is locked. Record adjustments in a later open period.', 409);
        this.db.prepare('INSERT INTO earnings VALUES(?,?,?,?,?,?,?)').run(id, input.earningId, input.employeeId, description, earnedAt, input.amountMinor, status);
      }
    });
    this.event(id, 'earnings_recorded', null, { count: inputs.length });
    return this.snapshot(id);
  }
  approve(id, earningId) {
    this.workspace(id);
    const e = this.db.prepare('SELECT * FROM earnings WHERE workspace_id=? AND id=?').get(id, earningId);
    if (!e) throw new InputError('Earning not found.', 404);
    if (e.status === 'approved') return this.snapshot(id);
    if (e.status !== 'pending') throw new InputError('Only pending earnings can be approved.', 409);
    if (this.db.prepare('SELECT 1 FROM pay_runs WHERE workspace_id=? AND period_start<=? AND period_end>?').get(id, e.earned_at, e.earned_at)) throw new InputError('This pay period is locked. Record adjustments in a later open period.', 409);
    this.db.prepare("UPDATE earnings SET status='approved' WHERE workspace_id=? AND id=?").run(id, earningId);
    this.event(id, 'earning_approved', e.employee_id, { earningId });
    return this.snapshot(id);
  }
  setFault(id, kind) {
    this.workspace(id);
    const column = { notification: 'notification_fault', payout: 'payout_fault', persistence: 'persistence_fault', ambiguous: 'ambiguous_fault' }[kind];
    if (!column) throw new InputError('Choose a supported failure.');
    this.db.prepare(`UPDATE workspaces SET ${column}=1 WHERE id=?`).run(id);
    this.event(id, 'failure_armed', null, { kind });
    return this.snapshot(id);
  }
  consume(id, column) { return this.db.prepare(`UPDATE workspaces SET ${column}=${column}-1 WHERE id=? AND ${column}>0`).run(id).changes > 0; }
  deliver(id, messageId) {
    const n = this.db.prepare('SELECT n.*,p.employee_id,p.period_start FROM notifications n JOIN payments p ON n.payment_id=p.id WHERE n.id=? AND p.workspace_id=?').get(messageId, id);
    if (!n || n.state === 'sent') return;
    this.event(id, 'notification_attempted', n.employee_id);
    let error = null;
    if (this.consume(id, 'notification_fault')) error = 'Notification delivery unavailable. Retry the notification.';
    else {
      this.db.prepare('INSERT OR IGNORE INTO provider_receipts VALUES(?,?,?,?)').run(id, n.period_start, n.employee_id, new Date().toISOString());
      if (this.consume(id, 'ambiguous_fault')) error = 'Delivery confirmation unavailable. Retry with the original message identity.';
    }
    this.db.prepare('UPDATE notifications SET attempts=attempts+1,state=?,last_error=? WHERE id=?').run(error ? 'pending' : 'sent', error, messageId);
    if (!error) paymentPolicy.afterNotification(this, id, n);
    this.event(id, error ? 'notification_failed' : 'notification_sent', n.employee_id, { messageId, error });
  }
  retryNotifications(id) {
    this.workspace(id);
    const rows = this.db.prepare("SELECT n.id FROM notifications n JOIN payments p ON p.id=n.payment_id WHERE p.workspace_id=? AND n.state='pending' ORDER BY p.created_at,n.id").all(id);
    for (const n of rows) this.deliver(id, n.id);
    return this.snapshot(id);
  }
  execute(id, scheduledFor = DEFAULT_RUN) {
    const workspace = this.workspace(id), period = payPeriod(scheduledFor);
    if (!this.db.prepare('SELECT 1 FROM pay_runs WHERE workspace_id=? AND period_start=?').get(id, period.start)) {
      const earnings = this.snapshot(id, scheduledFor).earnings.filter(e => e.earnedAt >= period.start && e.earnedAt < period.end);
      if (earnings.some(e => e.status === 'pending')) throw new InputError('Approve pending earnings in this period before running payroll.', 409);
      const approved = earnings.filter(e => e.status === 'approved');
      if (!approved.length) throw new InputError('Record approved earnings in this period before running payroll.', 409);
      this.transaction(() => {
        this.db.prepare('INSERT INTO pay_runs VALUES(?,?,?,?,?)').run(id, period.start, period.end, period.scheduledFor, new Date().toISOString());
        for (const employeeId of new Set(approved.map(e => e.employeeId))) {
          const items = approved.filter(e => e.employeeId === employeeId);
          this.db.prepare('INSERT INTO run_entries VALUES(?,?,?,?,?)').run(id, period.start, employeeId, items.reduce((sum, e) => sum + e.amountMinor, 0), JSON.stringify(items.map(e => e.earningId)));
        }
      });
    }
    const entries = this.db.prepare('SELECT r.*,e.name,e.bank,e.account_ending FROM run_entries r JOIN employees e ON e.workspace_id=r.workspace_id AND e.id=r.employee_id WHERE r.workspace_id=? AND r.period_start=? ORDER BY r.employee_id').all(id, period.start);
    for (const entry of entries) {
      if (paymentPolicy.wasPaid(this, id, period.start, entry.employee_id)) continue;
      if (this.consume(id, 'payout_fault')) { this.event(id, 'payment_failed', entry.employee_id, { reason: 'Payment was not recorded. Retry the pay run.' }); continue; }
      const interrupt = this.consume(id, 'persistence_fault');
      const paymentId = randomUUID(), notificationId = randomUUID();
      const savePayment = () => this.db.prepare('INSERT INTO payments VALUES(?,?,?,?,?,?,?,?,?,?)').run(paymentId, id, period.start, entry.employee_id, entry.amount_minor, workspace.behavior, entry.name, entry.bank, entry.account_ending, new Date().toISOString());
      const saveMessage = () => this.db.prepare('INSERT INTO notifications(id,payment_id) VALUES(?,?)').run(notificationId, paymentId);
      paymentPolicy.commitEntry(this, { id, entry, paymentId, notificationId, interrupt, savePayment, saveMessage });
    }
    if (paymentPolicy.dispatchAfterRun) this.retryNotifications(id);
    this.event(id, 'pay_run_finished', null, { scheduledFor: period.scheduledFor });
    return this.snapshot(id, scheduledFor);
  }
  snapshot(id, scheduledFor = DEFAULT_RUN) {
    this.workspace(id);
    const period = payPeriod(scheduledFor);
    const employees = this.db.prepare('SELECT * FROM employees WHERE workspace_id=? ORDER BY id').all(id).map(e => ({ id: e.id, name: e.name, role: e.role, department: e.department, bank: e.bank, accountEnding: e.account_ending }));
    const earnings = this.db.prepare('SELECT * FROM earnings WHERE workspace_id=? ORDER BY earned_at DESC,id').all(id).map(e => ({ earningId: e.id, employeeId: e.employee_id, description: e.description, earnedAt: e.earned_at, amountMinor: e.amount_minor, status: e.status }));
    const payments = this.db.prepare('SELECT * FROM payments WHERE workspace_id=? ORDER BY created_at DESC,id').all(id).map(p => ({ id: p.id, employeeId: p.employee_id, employeeName: p.employee_name, periodStart: p.period_start, amountMinor: p.amount_minor, bank: p.bank, accountEnding: p.account_ending, createdAt: p.created_at }));
    const notifications = this.db.prepare('SELECT n.*,p.employee_id,p.period_start,p.employee_name FROM notifications n JOIN payments p ON p.id=n.payment_id WHERE p.workspace_id=? ORDER BY p.created_at DESC,n.id').all(id).map(n => ({ id: n.id, paymentId: n.payment_id, employeeId: n.employee_id, employeeName: n.employee_name, periodStart: n.period_start, state: n.state, attempts: n.attempts, lastError: n.last_error }));
    const runs = this.db.prepare('SELECT * FROM pay_runs WHERE workspace_id=? ORDER BY scheduled_for DESC').all(id).map(r => ({ periodStart: r.period_start, periodEnd: r.period_end, scheduledFor: r.scheduled_for, createdAt: r.created_at, expectedMinor: this.db.prepare('SELECT COALESCE(SUM(amount_minor),0) AS total FROM run_entries WHERE workspace_id=? AND period_start=?').get(id, r.period_start).total }));
    const eligible = earnings.filter(e => e.status === 'approved' && e.earnedAt >= period.start && e.earnedAt < period.end);
    const entries = employees.map(e => {
      const items = eligible.filter(item => item.employeeId === e.id), paid = payments.filter(p => p.employeeId === e.id && p.periodStart === period.start);
      const expectedMinor = items.reduce((sum, item) => sum + item.amountMinor, 0), paidMinor = paid.reduce((sum, p) => sum + p.amountMinor, 0);
      return { employeeId: e.id, expectedMinor, paidMinor, earningIds: items.map(item => item.earningId), paymentCount: paid.length };
    }).filter(e => e.expectedMinor > 0 || e.paidMinor > 0);
    return { id, company: 'Northstar Studio', currency: 'NGN', period, employees, earnings, entries, payments, notifications, runs,
      locked: runs.some(r => r.periodStart === period.start), expectedMinor: entries.reduce((sum, e) => sum + e.expectedMinor, 0), paidMinor: entries.reduce((sum, e) => sum + e.paidMinor, 0),
      pendingApprovals: earnings.filter(e => e.status === 'pending' && e.earnedAt >= period.start && e.earnedAt < period.end).length,
      pendingNotifications: notifications.filter(n => n.state === 'pending').length,
      providerAccepted: this.db.prepare('SELECT COUNT(*) AS count FROM provider_receipts WHERE workspace_id=?').get(id).count,
      events: this.db.prepare('SELECT event,employee_id AS employeeId,detail,created_at AS createdAt FROM events WHERE workspace_id=? ORDER BY id').all(id).map(e => ({ ...e, detail: JSON.parse(e.detail) })) };
  }
}
