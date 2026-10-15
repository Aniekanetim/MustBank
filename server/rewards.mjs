import { randomUUID } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';

export const DEFAULT_RUN = '2026-10-13T09:00:00.000Z';
export const CREDITS = 10;

export class InputError extends Error {
  constructor(message, status = 400) { super(message); this.status = status; }
}

export function timestamp(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(value)) {
    throw new InputError('Use a timestamp with Z or an explicit UTC offset.');
  }
  const [year, month, day] = value.slice(0, 10).split('-').map(Number);
  const [hour, minute, second] = value.slice(11, 19).split(':').map(Number);
  const calendar = new Date(Date.UTC(year, month - 1, day));
  if (hour > 23 || minute > 59 || second > 59 || calendar.getUTCFullYear() !== year || calendar.getUTCMonth() !== month - 1 || calendar.getUTCDate() !== day || !Number.isFinite(Date.parse(value))) {
    throw new InputError('Use a valid calendar date and time.');
  }
  return new Date(value).toISOString();
}

export function settlementWindow(value) {
  const scheduledFor = timestamp(value);
  const run = new Date(scheduledFor);
  if (run.getUTCDay() !== 2 || run.getUTCHours() !== 9 || run.getUTCMinutes() || run.getUTCSeconds() || run.getUTCMilliseconds()) {
    throw new InputError('Use the original Tuesday 09:00 UTC scheduled run, including on retries.');
  }
  const end = Date.UTC(run.getUTCFullYear(), run.getUTCMonth(), run.getUTCDate() - 1);
  return { scheduledFor, start: new Date(end - 7 * 86400000).toISOString(), end: new Date(end).toISOString() };
}

export function normalizeTasks(tasks) {
  if (!Array.isArray(tasks) || tasks.length > 256) throw new InputError('Supply a task array with at most 256 entries.');
  const unique = new Map();
  for (const input of tasks) {
    if (!input || !['taskId', 'userId'].every(key => typeof input[key] === 'string' && /^[a-zA-Z0-9_-]{1,64}$/.test(input[key]))) {
      throw new InputError('Task and user IDs must contain 1-64 letters, digits, underscores or hyphens.');
    }
    const task = { taskId: input.taskId, userId: input.userId,
      title: typeof input.title === 'string' ? input.title.trim().slice(0, 160) : input.taskId,
      completedAt: timestamp(input.completedAt), status: input.status ?? 'completed' };
    if (!['completed', 'pending', 'cancelled'].includes(task.status)) throw new InputError('Use completed, pending or cancelled task status.');
    const previous = unique.get(task.taskId);
    if (previous && (previous.userId !== task.userId || previous.completedAt !== task.completedAt || previous.status !== task.status)) {
      throw new InputError('Conflicting records for one task ID. No tasks were imported.');
    }
    unique.set(task.taskId, task);
  }
  return [...unique.values()];
}

const SINGLE_TASK = { taskId: 'task-001', userId: 'user-001', title: 'Paperless statement enrolment', completedAt: '2026-10-08T12:00:00Z' };
const BOUNDARY_TASKS = [
  { taskId: 'start', userId: 'user-001', title: 'Paperless statement enrolment', completedAt: '2026-10-05T00:00:00Z' },
  { taskId: 'before', userId: 'user-001', title: 'Savings goal setup', completedAt: '2026-10-05T00:30:00+01:00' },
  { taskId: 'sunday', userId: 'user-001', title: 'Notification preferences updated', completedAt: '2026-10-11T23:59:59Z' },
  { taskId: 'end', userId: 'user-001', title: 'Direct debit registration', completedAt: '2026-10-12T00:00:00Z' },
  { taskId: 'pending', userId: 'user-002', title: 'Card autopay setup', completedAt: '2026-10-08T12:00:00Z', status: 'pending' },
];

export class RewardsService {
  constructor(path) {
    this.db = new DatabaseSync(path);
    this.db.exec(`PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;
      CREATE TABLE IF NOT EXISTS scenarios (
        id TEXT PRIMARY KEY, mode TEXT NOT NULL CHECK (mode IN ('fixed','faulty')),
        scheduled_for TEXT NOT NULL, created_at TEXT NOT NULL,
        notification_fault INTEGER NOT NULL DEFAULT 0, payout_fault INTEGER NOT NULL DEFAULT 0,
        persistence_fault INTEGER NOT NULL DEFAULT 0, ambiguous_fault INTEGER NOT NULL DEFAULT 0
      );
      CREATE TABLE IF NOT EXISTS tasks (
        scenario_id TEXT NOT NULL REFERENCES scenarios(id), task_id TEXT NOT NULL,
        user_id TEXT NOT NULL, title TEXT NOT NULL, completed_at TEXT NOT NULL, status TEXT NOT NULL,
        PRIMARY KEY (scenario_id, task_id)
      );
      CREATE TABLE IF NOT EXISTS payouts (
        id TEXT PRIMARY KEY, scenario_id TEXT NOT NULL REFERENCES scenarios(id), task_id TEXT NOT NULL,
        user_id TEXT NOT NULL, credits INTEGER NOT NULL CHECK (credits = 10), mode TEXT NOT NULL,
        week_start TEXT NOT NULL, created_at TEXT NOT NULL
      );
      CREATE UNIQUE INDEX IF NOT EXISTS one_fixed_payment ON payouts(scenario_id, task_id) WHERE mode = 'fixed';
      CREATE TABLE IF NOT EXISTS notification_work (
        id TEXT PRIMARY KEY, payout_id TEXT NOT NULL UNIQUE REFERENCES payouts(id),
        state TEXT NOT NULL CHECK (state IN ('pending','sent')), attempts INTEGER NOT NULL DEFAULT 0, last_error TEXT
      );
      CREATE TABLE IF NOT EXISTS processed_tasks (
        scenario_id TEXT NOT NULL, task_id TEXT NOT NULL, PRIMARY KEY (scenario_id, task_id)
      );
      CREATE TABLE IF NOT EXISTS provider_receipts (
        scenario_id TEXT NOT NULL, task_id TEXT NOT NULL, accepted_at TEXT NOT NULL,
        PRIMARY KEY (scenario_id, task_id)
      );
      CREATE TABLE IF NOT EXISTS events (
        id INTEGER PRIMARY KEY AUTOINCREMENT, scenario_id TEXT NOT NULL,
        event TEXT NOT NULL, task_id TEXT, detail TEXT NOT NULL, created_at TEXT NOT NULL
      );`);
  }

  close() { this.db.close(); }
  scenario(id) {
    const result = this.db.prepare('SELECT * FROM scenarios WHERE id = ?').get(id);
    if (!result) throw new InputError('Rewards account not found. Open a valid rewards account and try again.', 404);
    return result;
  }
  event(id, event, taskId = null, detail = {}) {
    this.db.prepare('INSERT INTO events (scenario_id,event,task_id,detail,created_at) VALUES (?,?,?,?,?)')
      .run(id, event, taskId, JSON.stringify(detail), new Date().toISOString());
  }
  transaction(work) {
    this.db.exec('BEGIN IMMEDIATE');
    try { const value = work(); this.db.exec('COMMIT'); return value; }
    catch (error) { this.db.exec('ROLLBACK'); throw error; }
  }
  create({ mode = 'fixed', fixture = 'single', scheduledFor = DEFAULT_RUN } = {}) {
    if (!['fixed', 'faulty'].includes(mode)) throw new InputError('Choose fixed or faulty behavior.');
    if (!['single', 'boundaries', 'empty'].includes(fixture)) throw new InputError('Choose single, boundaries or empty starting tasks.');
    const window = settlementWindow(scheduledFor);
    const id = randomUUID();
    this.db.prepare('INSERT INTO scenarios (id,mode,scheduled_for,created_at) VALUES (?,?,?,?)')
      .run(id, mode, window.scheduledFor, new Date().toISOString());
    this.addTasks(id, fixture === 'single' ? [SINGLE_TASK] : fixture === 'boundaries' ? BOUNDARY_TASKS : []);
    this.event(id, 'example_created', null, { mode, fixture });
    return this.snapshot(id);
  }
  addTasks(id, inputs) {
    this.scenario(id);
    const tasks = normalizeTasks(inputs);
    this.transaction(() => {
      for (const task of tasks) {
        const existing = this.db.prepare('SELECT * FROM tasks WHERE scenario_id = ? AND task_id = ?').get(id, task.taskId);
        if (existing) {
          if (existing.user_id !== task.userId || existing.completed_at !== task.completedAt || existing.status !== task.status) {
            throw new InputError('A saved task cannot change owner, completion time or status. Use a new task ID.');
          }
          continue;
        }
        this.db.prepare('INSERT INTO tasks VALUES (?,?,?,?,?,?)').run(id, task.taskId, task.userId, task.title, task.completedAt, task.status);
      }
    });
    return this.snapshot(id);
  }
  setFault(id, kind) {
    this.scenario(id);
    const column = { notification: 'notification_fault', payout: 'payout_fault', persistence: 'persistence_fault', ambiguous: 'ambiguous_fault' }[kind];
    if (!column) throw new InputError('Choose notification, payout, persistence or ambiguous failure.');
    this.db.prepare(`UPDATE scenarios SET ${column} = 1 WHERE id = ?`).run(id);
    this.event(id, 'failure_armed', null, { kind });
    return this.snapshot(id);
  }
  consumeFault(id, column) {
    const result = this.db.prepare(`UPDATE scenarios SET ${column} = ${column} - 1 WHERE id = ? AND ${column} > 0`).run(id);
    return result.changes > 0;
  }
  addPayout(id, task, window, mode) {
    const payoutId = randomUUID();
    this.db.prepare('INSERT INTO payouts VALUES (?,?,?,?,?,?,?,?)')
      .run(payoutId, id, task.taskId, task.userId, CREDITS, mode, window.start, new Date().toISOString());
    return payoutId;
  }
  addNotification(payoutId) {
    const messageId = randomUUID();
    this.db.prepare("INSERT INTO notification_work (id,payout_id,state) VALUES (?,?,'pending')").run(messageId, payoutId);
    return messageId;
  }
  deliver(id, messageId) {
    const message = this.db.prepare(`SELECT n.*, p.task_id FROM notification_work n
      JOIN payouts p ON p.id = n.payout_id WHERE n.id = ? AND p.scenario_id = ?`).get(messageId, id);
    if (!message || message.state === 'sent') return null;
    this.event(id, 'notification_attempted', message.task_id);
    let error = null;
    if (this.consumeFault(id, 'notification_fault')) error = 'Simulated notification provider unavailable before acceptance.';
    else {
      this.db.prepare('INSERT OR IGNORE INTO provider_receipts VALUES (?,?,?)').run(id, message.task_id, new Date().toISOString());
      if (this.consumeFault(id, 'ambiguous_fault')) error = 'Simulated acknowledgment lost after provider acceptance.';
    }
    if (error) {
      this.db.prepare('UPDATE notification_work SET attempts = attempts + 1, last_error = ? WHERE id = ?').run(error, messageId);
      this.event(id, 'notification_failed', message.task_id, { error });
      return { taskId: message.task_id, stage: 'notification', error };
    }
    this.db.prepare("UPDATE notification_work SET state = 'sent', attempts = attempts + 1, last_error = NULL WHERE id = ?").run(messageId);
    if (this.scenario(id).mode === 'faulty') {
      // CONTROLLED DEFECT: payout completion depends on notification success.
      this.db.prepare('INSERT OR IGNORE INTO processed_tasks VALUES (?,?)').run(id, message.task_id);
    }
    this.event(id, 'notification_sent', message.task_id);
    return null;
  }
  settle(id, scheduledFor) {
    const scenario = this.scenario(id);
    const window = settlementWindow(scheduledFor ?? scenario.scheduled_for);
    this.db.prepare('UPDATE scenarios SET scheduled_for = ? WHERE id = ?').run(window.scheduledFor, id);
    const tasks = this.snapshot(id).tasks.filter(task => task.status === 'completed' && task.completedAt >= window.start && task.completedAt < window.end);
    const failures = [];
    let paidNow = 0;
    for (const task of tasks) {
      const paid = this.db.prepare("SELECT 1 FROM payouts WHERE scenario_id = ? AND task_id = ? AND mode = 'fixed'").get(id, task.taskId);
      const processed = this.db.prepare('SELECT 1 FROM processed_tasks WHERE scenario_id = ? AND task_id = ?').get(id, task.taskId);
      if ((scenario.mode === 'fixed' && paid) || (scenario.mode === 'faulty' && processed)) {
        this.event(id, 'payout_already_completed', task.taskId);
        continue;
      }
      if (this.consumeFault(id, 'payout_fault')) {
        const failure = { taskId: task.taskId, stage: 'payout', error: 'Simulated payout failure before writing.' };
        failures.push(failure); this.event(id, 'payout_failed', task.taskId, failure); continue;
      }
      // Consume the test fault outside the transaction so rollback does not re-arm it.
      const interrupt = this.consumeFault(id, 'persistence_fault');
      if (scenario.mode === 'fixed') {
        try {
          this.transaction(() => {
            const payoutId = this.addPayout(id, task, window, 'fixed');
            if (interrupt) throw new Error('Simulated interruption before notification work is saved.');
            this.addNotification(payoutId);
          });
          paidNow++;
          this.event(id, 'payout_committed', task.taskId, { credits: CREDITS });
        } catch (error) {
          failures.push({ taskId: task.taskId, stage: 'payout', error: error.message });
          this.event(id, 'payout_rolled_back_before_commit', task.taskId, { error: error.message });
        }
      } else {
        const payoutId = this.addPayout(id, task, window, 'faulty');
        paidNow++; this.event(id, 'payout_committed', task.taskId, { credits: CREDITS });
        if (interrupt) {
          failures.push({ taskId: task.taskId, stage: 'payout', error: 'Simulated interruption after an unsafe payout commit.' });
          continue;
        }
        const failure = this.deliver(id, this.addNotification(payoutId));
        if (failure) failures.push(failure);
      }
    }
    if (scenario.mode === 'fixed') failures.push(...this.dispatch(id));
    const run = { eligibleTasks: tasks.length, paidNow, failures, window };
    this.event(id, 'settlement_finished', null, run);
    return { ...this.snapshot(id), run };
  }
  dispatch(id) {
    this.scenario(id);
    const pending = this.db.prepare(`SELECT n.id FROM notification_work n JOIN payouts p ON p.id = n.payout_id
      WHERE p.scenario_id = ? AND n.state = 'pending' ORDER BY p.created_at,n.id`).all(id);
    return pending.map(row => this.deliver(id, row.id)).filter(Boolean);
  }
  retryNotifications(id) {
    const failures = this.dispatch(id);
    this.event(id, 'notification_recovery_finished', null, { failures });
    return { ...this.snapshot(id), recovery: { failures } };
  }
  customerSnapshot(id, userId) {
    const source = this.snapshot(id);
    const tasks = source.tasks.filter(task => task.userId === userId);
    const payouts = source.payouts.filter(payout => payout.userId === userId);
    const taskIds = new Set(tasks.map(task => task.taskId));
    const notifications = source.notifications.filter(item => taskIds.has(item.taskId)).map(item => ({ ...item, lastError: null }));
    return { id: source.id, window: source.window, tasks, payouts, notifications,
      totalCredits: payouts.reduce((sum, payout) => sum + payout.credits, 0),
      pendingNotifications: notifications.filter(item => item.state === 'pending').length,
      balances: { [userId]: source.balances[userId] ?? 0 }, events: [] };
  }
  snapshot(id) {
    const scenario = this.scenario(id);
    const window = settlementWindow(scenario.scheduled_for);
    const tasks = this.db.prepare(`SELECT task_id AS taskId,user_id AS userId,title,completed_at AS completedAt,status
      FROM tasks WHERE scenario_id = ? ORDER BY completed_at,task_id`).all(id);
    const payouts = this.db.prepare(`SELECT id,task_id AS taskId,user_id AS userId,credits,week_start AS weekStart,created_at AS createdAt
      FROM payouts WHERE scenario_id = ? ORDER BY created_at,id`).all(id);
    const notifications = this.db.prepare(`SELECT n.id,n.payout_id AS payoutId,p.task_id AS taskId,n.state,n.attempts,n.last_error AS lastError
      FROM notification_work n JOIN payouts p ON p.id = n.payout_id WHERE p.scenario_id = ? ORDER BY p.created_at,n.id`).all(id);
    const receipts = this.db.prepare('SELECT task_id AS taskId,accepted_at AS acceptedAt FROM provider_receipts WHERE scenario_id = ?').all(id);
    const events = this.db.prepare('SELECT id,event,task_id AS taskId,detail,created_at AS createdAt FROM events WHERE scenario_id = ? ORDER BY id').all(id)
      .map(row => ({ ...row, detail: JSON.parse(row.detail) }));
    const balances = Object.create(null);
    for (const payout of payouts) balances[payout.userId] = (balances[payout.userId] ?? 0) + payout.credits;
    return { id, mode: scenario.mode, createdAt: scenario.created_at, window, tasks, payouts, notifications, receipts, events,
      balances, totalCredits: payouts.reduce((sum, row) => sum + row.credits, 0),
      pendingNotifications: notifications.filter(row => row.state === 'pending').length,
      armedFailures: { notification: scenario.notification_fault, payout: scenario.payout_fault, persistence: scenario.persistence_fault, ambiguous: scenario.ambiguous_fault } };
  }
}
