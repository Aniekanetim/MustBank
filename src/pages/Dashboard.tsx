import { ArrowRight, CreditCard, Wallet } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useBank } from '../store/useBank';
import { fmtSGD } from '../store/bank';
import { ActivityTable, EmptyState, PageHeader, PanelHeading } from '../components/BankUI';

export function Dashboard() {
  const state = useBank();
  const available = state.accounts.filter(account => account.type !== 'credit').reduce((sum, account) => sum + account.balance, 0);
  return <><PageHeader title="Account overview" description="Your balances and recent activity, in one place." actions={<Link className="btn-primary" to="/transfer">Make a transfer<ArrowRight size={17} aria-hidden="true" /></Link>} />
    <section className="balance-summary" aria-labelledby="available-heading"><div><p id="available-heading">Available across your accounts</p><strong className="total-balance money" data-testid="available-balance">{fmtSGD(available)}</strong><span>SGD · checking and savings</span></div><div className="balance-note"><Wallet size={22} aria-hidden="true" /><span>{state.accounts.filter(account => account.type !== 'credit').length} deposit accounts</span></div></section>
    <section aria-labelledby="accounts-heading"><PanelHeading title="Your accounts" id="accounts-heading" /><div className="account-grid">{state.accounts.map(account => <article className="account-card" key={account.id}><div className="account-card-top"><span>{account.type === 'credit' ? 'Credit card' : account.type === 'savings' ? 'Savings account' : 'Checking account'}</span>{account.type === 'credit' ? <CreditCard size={20} aria-hidden="true" /> : <Wallet size={20} aria-hidden="true" />}</div><h3>{account.nickname}</h3><p className="account-number">Account ending {account.number}</p><p className="account-balance money">{fmtSGD(account.type === 'credit' ? Math.abs(account.balance) : account.balance)}</p><div className="account-card-footer"><span>{account.type === 'credit' ? account.balance < 0 ? 'Balance owed' : 'Credit balance' : 'Available balance'}</span><Link to={`/transactions?account=${account.id}`} aria-label={`View activity for ${account.nickname}`}>View activity<ArrowRight size={16} aria-hidden="true" /></Link></div></article>)}</div></section>
    <section className="panel activity-panel"><PanelHeading title="Recent activity" description="Your five most recent transactions." link={{ to: '/transactions', text: 'View all activity' }} />{state.transactions.length ? <ActivityTable transactions={state.transactions.slice(0, 5)} state={state} /> : <EmptyState title="No recent activity" description="Your transfers will appear here once completed." action={<Link className="btn-secondary" to="/transfer">Make a transfer</Link>} />}</section>
    <Link to="/rewards" className="rewards-prompt"><div><strong>Make the most of your banking</strong><span>Track your reward credits and weekly payouts.</span></div><span>View rewards<ArrowRight size={17} aria-hidden="true" /></span></Link>
  </>;
}
