import { CheckCircle2, Clock3, Download, RefreshCw } from 'lucide-react';
import { csvCell, downloadFile, PageHeader, PanelHeading, StatusPill } from '../components/BankUI';
import { CUSTOMER_ID, useRewards, utcDate, utcTime } from '../hooks/useRewards';
import { localRewardTime, scheduledRewardPayment } from '../store/rewardSchedule';

export function RewardsPage() {
  const { snapshot, busy, error, notice, refresh, updatedAt } = useRewards(true);
  const tasks = (snapshot?.tasks.filter(task => task.userId === CUSTOMER_ID) ?? []).slice().sort((a, b) => b.completedAt.localeCompare(a.completedAt));
  const payouts = (snapshot?.payouts.filter(payout => payout.userId === CUSTOMER_ID) ?? []).slice().reverse();
  const paid = new Set(payouts.map(payout => payout.taskId));
  const unpaid = tasks.filter(task => task.status === 'completed' && !paid.has(task.taskId));
  const pendingCredits = unpaid.length * 10;
  const nextPayment = unpaid.map(task => scheduledRewardPayment(task.completedAt)).sort()[0];
  const nextPaymentCredits = unpaid.filter(task => scheduledRewardPayment(task.completedAt) === nextPayment).length * 10;
  const delayed = Boolean(nextPayment && new Date(nextPayment).getTime() < Date.now());
  function statement() {
    const rows = [['Date (UTC)', 'Activity', 'Credits', 'Status', 'Reference'], ...payouts.map(payout => [utcTime(payout.createdAt), tasks.find(task => task.taskId === payout.taskId)?.title ?? 'Reward payout', payout.credits, 'Paid', payout.id])];
    downloadFile('mustbank-rewards-statement.csv', rows.map(row => row.map(csvCell).join(',')).join('\r\n'), 'text/csv;charset=utf-8');
  }
  return <>
    <PageHeader title="Your rewards" description="Track your credits and payment status." actions={<>
      <button className="btn-secondary" onClick={refresh} disabled={busy}><RefreshCw size={17} aria-hidden="true" />Refresh</button>
      {payouts.length > 0 && <button className="btn-primary" onClick={statement} disabled={busy}><Download size={17} aria-hidden="true" />Download statement</button>}
    </>} />
    <p className="live-notice" role="status">{busy ? 'Updating your rewards…' : notice}</p>
    {error && <div className="error-message" role="alert">{error}<button className="btn-secondary" onClick={refresh}>Try again</button></div>}
    {snapshot && <>
      <section className="reward-summary" aria-label="Reward balances">
        <div><p>Balance paid</p><strong data-testid="reward-balance" className="money">{payouts.reduce((sum, item) => sum + item.credits, 0)} credits</strong></div>
        <div><p>Awaiting payment</p><strong className="money">{pendingCredits} credits</strong></div>
        <div><p>Payments received</p><strong data-testid="payout-count" className="money">{payouts.length}</strong></div>
      </section>
      {nextPayment ? <section className={`payment-notice${delayed ? ' payment-delayed' : ''}`} aria-labelledby="payment-heading">
        <Clock3 size={22} aria-hidden="true" /><div><h2 id="payment-heading">{delayed ? 'Reward payment delayed' : 'Next reward payment'}</h2>
          <p><strong>{nextPaymentCredits} credits</strong> {delayed ? 'await payment.' : 'scheduled.'}{unpaid.some(task => scheduledRewardPayment(task.completedAt) !== nextPayment) ? ' Other activities have a later payment date.' : ''}</p>
          <p>Scheduled: <time dateTime={nextPayment}>{localRewardTime(nextPayment)}</time></p>
          <p className="field-hint">{delayed ? 'Credits remain recorded. Refresh for updates.' : 'Your local time is shown. No further action is needed.'}</p>
        </div>
      </section> : <section className="payment-notice payment-up-to-date"><CheckCircle2 size={22} aria-hidden="true" /><div><h2 id="payment-heading">{tasks.length ? 'Your rewards are up to date' : 'Start earning rewards'}</h2><p>{tasks.length ? 'There are no completed activities waiting for payment.' : 'Eligible completed banking activities will appear here.'}</p></div></section>}

      <section className="panel reward-activities-panel"><PanelHeading title="Your reward activities" description="10 credits per eligible activity, once." />
        {tasks.length ? <div className="table-wrap"><table className="data-table reward-activities-table"><caption className="sr-only">Banking activities and reward payment status</caption><thead><tr><th scope="col">Activity</th><th scope="col" className="date-column">Completed (UTC)</th><th scope="col">Reward status</th></tr></thead><tbody>{tasks.map(task => {
          const scheduled = task.status === 'completed' ? scheduledRewardPayment(task.completedAt) : null;
          const overdue = scheduled && Date.parse(scheduled) < Date.now();
          return <tr key={task.taskId}><td><strong>{task.title}</strong><span className="mobile-detail">{task.status === 'completed' ? `${utcDate(task.completedAt)} UTC` : 'Not completed'}</span></td><td className="date-column">{task.status === 'completed' ? utcDate(task.completedAt) : '—'}</td><td>{paid.has(task.taskId) ? <StatusPill status="paid" /> : scheduled ? <><StatusPill status="pending" label={overdue ? 'Payment delayed' : 'Scheduled'} /><span className="secondary-line">Due {utcDate(scheduled)}</span></> : <span>Not completed</span>}</td></tr>;
        })}</tbody></table></div> : <div className="compact-empty"><p>No reward activities yet. Your eligible completed activities will appear here.</p></div>}
      </section>

      <section className="panel"><PanelHeading title="Payout history" description="Payment and confirmation delivery are recorded separately." />
        {payouts.length ? <div className="table-wrap"><table className="data-table rewards-history-table"><caption className="sr-only">Reward payouts and confirmation status</caption><thead><tr><th scope="col">Activity</th><th scope="col" className="date-column">Paid on (UTC)</th><th scope="col" className="status-column">Status</th><th scope="col" className="amount-column">Credits</th></tr></thead><tbody>{payouts.map(payout => {
          const notification = snapshot.notifications.find(item => item.payoutId === payout.id);
          return <tr key={payout.id}><td><strong>{tasks.find(task => task.taskId === payout.taskId)?.title ?? 'Reward payout'}</strong><span className="secondary-line">Paid {utcDate(payout.createdAt)} · {notification?.state === 'sent' ? 'Confirmation sent' : 'Confirmation pending'}</span></td><td className="date-column">{utcDate(payout.createdAt)}</td><td className="status-column"><StatusPill status="paid" /></td><td className="amount-column money">+{payout.credits}</td></tr>;
        })}</tbody></table></div> : <div className="compact-empty"><p>No payouts yet. Your first payment and statement will appear here after settlement.</p></div>}
      </section>

      <section className="credits-explainer" aria-labelledby="credits-heading"><h2 id="credits-heading">About your credits</h2><p>Reward credits are program points, separate from your SGD account balances. Cash conversion and redemption are not available in this rewards program.</p></section>
      <details className="rewards-terms"><summary>How your rewards are paid</summary><div><p>Each eligible completed activity earns 10 credits, once. Rewards are settled every Tuesday at 09:00 UTC.</p><p>The weekly period starts Monday at 00:00 UTC and ends the following Monday at 00:00 UTC. An activity completed exactly at the ending boundary belongs to the next period.</p><p>A delayed confirmation does not change a payout that has already been recorded.</p><p>Settlement period shown in the processing records: {utcDate(snapshot.window.start)} to {utcDate(snapshot.window.end)}, with the ending boundary excluded.</p></div></details>
      {updatedAt && <p className="last-updated">Last checked {localRewardTime(updatedAt.toISOString())}</p>}
    </>}
  </>;
}
