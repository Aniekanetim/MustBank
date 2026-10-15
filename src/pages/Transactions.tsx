import { useSearchParams } from 'react-router-dom';
import { Search, X } from 'lucide-react';
import { useBank } from '../store/useBank';
import { ActivityTable, EmptyState, PageHeader, recipientName } from '../components/BankUI';

export function TransactionsPage() {
  const state = useBank();
  const [params, setParams] = useSearchParams();
  const query = params.get('q') ?? '';
  const account = state.accounts.some(item => item.id === params.get('account')) ? params.get('account')! : 'all';
  const status = ['completed', 'pending', 'failed'].includes(params.get('status') ?? '') ? params.get('status')! : 'all';
  const recipient = state.recipients.find(item => item.id === params.get('recipient'));
  const transactions = state.transactions.filter(item =>
    (account === 'all' || item.fromAccountId === account || item.toAccountId === account)
    && (status === 'all' || item.status === status)
    && (!recipient || item.toRecipientId === recipient.id)
    && `${item.memo ?? ''} ${recipientName(item, state)} ${state.accounts.find(value => value.id === item.fromAccountId)?.nickname ?? ''} ${item.id}`.toLowerCase().includes(query.trim().toLowerCase()));
  const hasFilters = Boolean(query || account !== 'all' || status !== 'all' || recipient);
  function filter(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (!value || value === 'all') next.delete(key); else next.set(key, value);
    setParams(next, { replace: true });
  }
  return <><PageHeader title="Account activity" description="Open a payment to view its receipt, reference and details." />
    {recipient && <div className="filter-context"><span>Payments to {recipient.name}</span><button className="text-link" onClick={() => filter('recipient', '')} aria-label="Clear recipient filter"><X size={15} aria-hidden="true" />Clear recipient</button></div>}
    <section className="panel"><div className="filter-bar"><div className="search-field"><label className="sr-only" htmlFor="activity-search">Search activity</label><Search size={18} aria-hidden="true" /><input id="activity-search" type="search" placeholder="Search name, description or reference" value={query} onChange={event => filter('q', event.target.value)} /></div>
      <div className="filter-field"><label htmlFor="activity-account">Account</label><select id="activity-account" value={account} onChange={event => filter('account', event.target.value)}><option value="all">All accounts</option>{state.accounts.map(item => <option value={item.id} key={item.id}>{item.nickname}</option>)}</select></div>
      <div className="filter-field"><label htmlFor="activity-status">Status</label><select id="activity-status" value={status} onChange={event => filter('status', event.target.value)}><option value="all">All statuses</option><option value="completed">Completed</option><option value="pending">Pending</option><option value="failed">Failed</option></select></div></div>
      <div className="activity-summary"><p className="result-count" role="status">{transactions.length} {transactions.length === 1 ? 'transaction' : 'transactions'} · dates shown in your local time</p>{hasFilters && transactions.length > 0 && <button className="text-link" onClick={() => setParams({})}>Clear filters</button>}</div>
      {transactions.length ? <ActivityTable transactions={transactions} state={state} accountId={account === 'all' ? undefined : account} /> : <EmptyState title="No matching activity" description={query ? `No payments match “${query}”. Try another name or reference.` : 'Try another recipient, account or status.'} action={<button className="btn-secondary" onClick={() => setParams({})}>Clear filters</button>} />}
    </section></>;
}
