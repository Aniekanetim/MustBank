import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { readStoredValue } from '../store/storage';

type Task = { taskId: string; userId: string; title: string; completedAt: string; status: string };
type Snapshot = {
  id: string; mode: 'fixed' | 'faulty'; window: { scheduledFor: string; start: string; end: string };
  tasks: Task[]; payouts: { id: string; taskId: string; userId: string; credits: number }[];
  notifications: { id: string; taskId: string; state: string; attempts: number; lastError: string | null }[];
  totalCredits: number; pendingNotifications: number;
  armedFailures: { notification: number; payout: number; persistence: number; ambiguous: number };
  events: { id: number; event: string; taskId: string | null; createdAt: string; detail: Record<string, unknown> }[];
  run?: { paidNow: number; failures: unknown[] }; recovery?: { failures: unknown[] };
};
const STORED_EXAMPLE = 'mustbank.quest.example.v1';
const DEFAULT_RUN = '2026-10-13T09:00:00Z';
const utc = (value: string) => value.replace('T', ' ').replace('.000Z', ' UTC').replace('Z', ' UTC');

async function api(path: string, data?: unknown): Promise<Snapshot> {
  let response: Response;
  try { response = await fetch(path, data === undefined ? {} : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }); }
  catch { throw new Error('Unable to reach the rewards service. Start the app with npm run dev and try again.'); }
  let result;
  try { result = await response.json(); }
  catch { throw new Error('Rewards service unavailable. Start the app with npm run dev and try again.'); }
  if (!response.ok) throw new Error(result.error ?? 'Unable to complete the action.');
  return result;
}

function eventLabel(event: Snapshot['events'][number]) {
  return ({ example_created: 'Example started', failure_armed: 'One failure armed', payout_committed: 'Paid 10 credits',
    notification_attempted: 'Attempted notification delivery', notification_failed: 'Notification failed',
    notification_sent: 'Notification delivered', payout_already_completed: 'Kept the existing payout',
    payout_failed: 'Payment failed', payout_rolled_back_before_commit: 'Interrupted payment rolled back before completion',
    settlement_finished: 'Settlement finished', notification_recovery_finished: 'Notification recovery finished' } as Record<string, string>)[event.event] ?? event.event;
}

export function RewardsPage() {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [mode, setMode] = useState<'fixed' | 'faulty'>('fixed');
  const [fixture, setFixture] = useState('single');
  const [scheduledFor, setScheduledFor] = useState(DEFAULT_RUN);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [taskId, setTaskId] = useState('task-002');

  function save(value: Snapshot) {
    setSnapshot(value);
    localStorage.setItem(STORED_EXAMPLE, value.id); // Only the reference is cached; the API owns payment records.
  }
  useEffect(() => {
    let cancelled = false;
    const saved = readStoredValue(STORED_EXAMPLE, '.quest.example.v1', value => /^[a-f0-9-]{36}$/.test(value));
    async function load() {
      let value: Snapshot;
      try { value = saved ? await api(`/api/scenarios/${saved}`) : await api('/api/scenarios', {}); }
      catch (failure) {
        if (saved && (failure as Error).message.startsWith('Example not found')) value = await api('/api/scenarios', {});
        else throw failure;
      }
      if (!cancelled) { save(value); setMode(value.mode); setScheduledFor(value.window.scheduledFor); setBusy(false); }
    }
    load().catch(failure => { if (!cancelled) { setError(failure.message); setBusy(false); } });
    return () => { cancelled = true; };
  }, []);

  async function action(work: () => Promise<Snapshot>, message: string | ((value: Snapshot) => string)) {
    setBusy(true); setError(''); setNotice('');
    try { const value = await work(); save(value); setNotice(typeof message === 'function' ? message(value) : message); }
    catch (failure) { setError((failure as Error).message); }
    finally { setBusy(false); }
  }
  const start = () => action(() => api('/api/scenarios', { mode, fixture, scheduledFor }), 'Started a fresh example. Earlier records are preserved separately.');
  const scoped = (path: string, data = {}) => api(`/api/scenarios/${snapshot!.id}/${path}`, data);
  const run = () => action(() => scoped('settle', { scheduledFor }), value => `${value.run!.paidNow} new payouts. ${value.pendingNotifications} notifications pending.`);
  const retry = () => action(() => scoped('retry-notifications'), value => `Notification recovery finished. ${value.pendingNotifications} notifications pending.`);

  function addTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    action(() => scoped('tasks', { tasks: [{ taskId: form.get('taskId'), userId: form.get('userId'), title: form.get('title'),
      completedAt: form.get('completedAt'), status: form.get('status') }] }), 'Saved the task. Run settlement to check its eligibility.');
  }
  function exportEvidence() {
    const url = URL.createObjectURL(new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a'); link.href = url; link.download = `mustbank-example-${snapshot!.id}.json`; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <div className="rewards-page">
      <p className="eyebrow">Quest assessment · fictional test credits</p>
      <h1 className="page-title">Rewards and settlements</h1>
      <p className="page-sub">One completed task earns 10 credits once. A failed notification must leave that payout intact.</p>
      <div className="banner">This rewards flow is an assessment extension. The faulty example deliberately introduces unsafe retry behavior.</div>
      <section className="quest-section" aria-labelledby="example-heading">
        <h2 id="example-heading">1. Choose an example</h2>
        <div className="example-controls">
          <div className="form-row"><label htmlFor="behavior">Behavior for a new example</label>
            <select id="behavior" value={mode} onChange={event => setMode(event.target.value as 'fixed' | 'faulty')} disabled={busy}>
              <option value="fixed">Corrected reference</option><option value="faulty">Faulty assessment example</option>
            </select></div>
          <div className="form-row"><label htmlFor="fixture">Starting tasks</label>
            <select id="fixture" value={fixture} onChange={event => setFixture(event.target.value)} disabled={busy}>
              <option value="single">One qualifying task</option><option value="boundaries">Weekly boundary examples</option><option value="empty">No tasks</option>
            </select></div>
          <button className="btn-secondary" onClick={start} disabled={busy}>Start new example</button>
        </div>
      </section>
      <p className="quest-notice" role="status" aria-live="polite">{busy ? 'Loading records…' : notice}</p>
      {error && <p className="quest-error" role="alert">{error}</p>}
      {snapshot && <>
        <section className="quest-section" aria-labelledby="outcome-heading">
          <div className="section-heading"><h2 id="outcome-heading">2. Inspect the outcome</h2><span className={`mode-tag ${snapshot.mode}`}>{snapshot.mode === 'fixed' ? 'Corrected reference' : 'Faulty example'}</span></div>
          <div className="cards reward-cards">
            <article className="card"><h3>Total rewarded</h3><p className="balance" data-testid="reward-balance">{snapshot.totalCredits} credits</p></article>
            <article className="card"><h3>Payout records</h3><p className="balance" data-testid="payout-count">{snapshot.payouts.length}</p></article>
            <article className="card"><h3>Pending notifications</h3><p className="balance" data-testid="pending-count">{snapshot.pendingNotifications}</p></article>
          </div>
          <div className="settlement-controls">
            <div className="form-row"><label htmlFor="scheduledFor">Scheduled run in UTC</label><input id="scheduledFor" type="text" name="scheduledFor" value={scheduledFor} onChange={event => setScheduledFor(event.target.value)} aria-describedby="schedule-hint" />
              <p id="schedule-hint" className="hint">Tuesday 09:00 UTC. Keep the original scheduled time when retrying.</p></div>
            <p className="window-copy">Eligible window: <strong>{utc(snapshot.window.start)}</strong> through <strong>{utc(snapshot.window.end)}</strong>, with the end excluded.</p>
            <div className="action-row">
              <button className="btn-primary" onClick={run} disabled={busy}>Run settlement</button>
              <button className="btn-secondary" onClick={() => action(() => scoped('faults', { kind: 'notification' }), 'The next notification attempt will fail once.')} disabled={busy}>Fail next notification</button>
              <button className="btn-secondary" onClick={retry} disabled={busy || snapshot.pendingNotifications === 0}>Retry notifications</button>
            </div>
            {snapshot.armedFailures.notification > 0 && <p className="hint">One notification failure is armed.</p>}
            <p className="hint">To reproduce the defect: start a faulty example, fail the next notification, then run the same settlement twice.</p>
          </div>
        </section>
        <section className="quest-section" aria-labelledby="tasks-heading">
          <h2 id="tasks-heading">3. Check tasks against the rule</h2>
          <div className="table-scroll" role="region" aria-label="Task eligibility" tabIndex={0}>
            <table><caption className="sr-only">Task eligibility and payout counts for this example</caption><thead><tr><th scope="col">Task</th><th scope="col">Owner</th><th scope="col">Completed at UTC</th><th scope="col">Eligibility</th><th scope="col">Payouts</th></tr></thead>
              <tbody>{snapshot.tasks.map(task => <tr key={task.taskId}><th scope="row"><strong>{task.taskId}</strong><span className="cell-note">{task.title}</span></th><td>{task.userId}</td><td>{utc(task.completedAt)}</td><td>{task.status !== 'completed' ? task.status : task.completedAt >= snapshot.window.start && task.completedAt < snapshot.window.end ? 'Qualifies' : 'Outside window'}</td><td>{snapshot.payouts.filter(payout => payout.taskId === task.taskId).length}</td></tr>)}</tbody>
            </table>
            {snapshot.tasks.length === 0 && <p className="empty-copy">No tasks yet. Add a task below to check its reward.</p>}
          </div>
          <details className="add-task"><summary>Add a task</summary>
            <form className="task-form" onSubmit={addTask}>
              <div className="form-row"><label htmlFor="taskId">Task ID</label><input id="taskId" name="taskId" value={taskId} onChange={event => setTaskId(event.target.value)} pattern="[a-zA-Z0-9_-]{1,64}" required /></div>
              <div className="form-row"><label htmlFor="userId">User ID</label><input id="userId" name="userId" defaultValue="user-001" pattern="[a-zA-Z0-9_-]{1,64}" required /></div>
              <div className="form-row"><label htmlFor="title">Task description</label><input id="title" name="title" maxLength={160} placeholder="Complete a marketplace task" /></div>
              <div className="form-row"><label htmlFor="completedAt">Completion timestamp</label><input id="completedAt" name="completedAt" defaultValue="2026-10-08T12:00:00Z" aria-describedby="time-hint" required /><p id="time-hint" className="hint">Include Z or an offset, for example 2026-10-05T01:00:00+01:00.</p></div>
              <div className="form-row"><label htmlFor="task-status">Task status</label><select id="task-status" name="status"><option value="completed">Completed</option><option value="pending">Pending</option><option value="cancelled">Cancelled</option></select></div>
              <button className="btn-secondary" type="submit" disabled={busy}>Save task</button>
            </form>
          </details>
        </section>
        <section className="quest-section" aria-labelledby="notification-heading"><h2 id="notification-heading">4. Follow notification recovery</h2>
          {snapshot.notifications.length === 0 ? <p className="empty-copy">No payout notifications yet. Run settlement for a qualifying task.</p> :
            <ul className="notification-list">{snapshot.notifications.map(message => <li key={message.id}><strong>{message.taskId}</strong><span>{message.state === 'sent' ? 'Delivered' : 'Pending delivery'} · {message.attempts} attempts</span>{message.lastError && <p>{message.lastError}</p>}</li>)}</ul>}
        </section>
        <section className="quest-section" aria-labelledby="events-heading"><div className="section-heading"><h2 id="events-heading">5. Review the evidence</h2><button className="btn-secondary" onClick={exportEvidence} disabled={busy}>Export example</button></div>
          <p className="hint">Credits and payment records are saved by the service. This export contains the full example and event history.</p>
          <ol className="event-list">{snapshot.events.slice(-16).map(event => <li key={event.id}><time dateTime={event.createdAt}>{new Date(event.createdAt).toLocaleTimeString('en-GB', { timeZone: 'UTC' })} UTC</time><span>{eventLabel(event)}{event.taskId ? ` · ${event.taskId}` : ''}</span></li>)}</ol>
        </section>
      </>}
    </div>
  );
}
