import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search } from 'lucide-react';
import { useBank } from '../store/useBank';
import { ActivityTable, EmptyState, PageHeader, recipientName } from '../components/BankUI';

export function TransactionsPage() {
  const state = useBank(); const [params] = useSearchParams();
  const [query, setQuery] = useState(''); const [account, setAccount] = useState(params.get('account') ?? 'all'); const [status, setStatus] = useState('all');
  const transactions = state.transactions.filter(item => (account === 'all' || item.fromAccountId === account || item.toAccountId === account)
    && (status === 'all' || item.status === status)
    && `${item.memo ?? ''} ${recipientName(item, state)} ${state.accounts.find(value => value.id === item.fromAccountId)?.nickname ?? ''} ${item.id}`.toLowerCase().includes(query.trim().toLowerCase()));
  const clear = () => { setQuery(''); setAccount('all'); setStatus('all'); };
  return <><PageHeader title="Account activity" description="Search your transactions and see where your money goes." />
    <section className="panel"><div className="filter-bar"><div className="search-field"><label className="sr-only" htmlFor="activity-search">Search activity</label><Search size={18} aria-hidden="true" /><input id="activity-search" type="search" placeholder="Search recipient, description or reference" value={query} onChange={event => setQuery(event.target.value)} /></div>
      <div className="filter-field"><label htmlFor="activity-account">Account</label><select id="activity-account" value={account} onChange={event => setAccount(event.target.value)}><option value="all">All accounts</option>{state.accounts.map(item => <option value={item.id} key={item.id}>{item.nickname}</option>)}</select></div>
      <div className="filter-field"><label htmlFor="activity-status">Status</label><select id="activity-status" value={status} onChange={event => setStatus(event.target.value)}><option value="all">All statuses</option><option value="completed">Completed</option><option value="pending">Pending</option><option value="failed">Failed</option></select></div></div>
      <p className="result-count" role="status">{transactions.length} {transactions.length === 1 ? 'transaction' : 'transactions'} · dates shown in your local time</p>
      {transactions.length ? <ActivityTable transactions={transactions} state={state} /> : <EmptyState title="No matching activity" description="Try another recipient, account or status." action={<button className="btn-secondary" onClick={clear}>Clear filters</button>} />}
    </section></>;
}
