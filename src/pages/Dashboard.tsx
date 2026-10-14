import { useBank } from '../store/useBank';
import { fmtSGD } from '../store/bank';

export function Dashboard() {
  const { accounts, transactions } = useBank();
  const recent = transactions.slice(0, 5);

  return (
    <>
      <h1 className="page-title">Account overview</h1>
      <p className="page-sub">Review your simulated balances and recent transfers.</p>

      <div className="banner">
        <strong>Assessment sandbox:</strong> these accounts use fictional funds. Task rewards and weekly settlements are available on the Rewards page.
      </div>

      <div className="cards">
        {accounts.map(a => (
          <div key={a.id} className={`card ${a.type}`}>
            <div className="label">{a.type}</div>
            <div className="nick">{a.nickname}</div>
            <div className="num">•••• {a.number}</div>
            <div className="balance">{fmtSGD(a.balance)}</div>
          </div>
        ))}
      </div>

      <h2 className="section-title">Recent activity</h2>
      <div className="list">
        {recent.map(t => {
          const fromAcct = accounts.find(a => a.id === t.fromAccountId);
          return (
            <div key={t.id} className="list-row">
              <div className="date">{new Date(t.ts).toLocaleDateString('en-SG', { month: 'short', day: 'numeric' })}</div>
              <div>{t.memo ?? 'Transfer'} <span style={{ color: 'var(--text-dim)' }}>· from {fromAcct?.nickname}</span></div>
              <div className="amount">−{fmtSGD(t.amount)}</div>
              <div className="transaction-status">{t.status}</div>
            </div>
          );
        })}
      </div>
    </>
  );
}
