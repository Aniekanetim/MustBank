import { useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowUpRight, Plus, Search, UserRound } from 'lucide-react';
import { useBank } from '../store/useBank';
import { accountEnding, activeRecipients } from '../store/bank';
import { EmptyState, PageHeader } from '../components/BankUI';
import { RecipientEditor } from '../components/RecipientEditor';

export function RecipientsPage() {
  const recipients = activeRecipients(useBank());
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const adding = params.get('add') === 'true';
  const returnToTransfer = params.get('returnTo') === 'transfer';
  const [query, setQuery] = useState('');
  const [notice, setNotice] = useState<string>(location.state?.notice ?? '');
  const matches = recipients.filter(item => `${item.name} ${item.bank} ${accountEnding(item.accountNumber)}`.toLowerCase().includes(query.toLowerCase().trim()));
  function cancel() { if (returnToTransfer) navigate('/transfer?resume=1'); else setParams({}); }
  return <>
    {adding && returnToTransfer && <Link className="text-link back-link" to="/transfer?resume=1"><ArrowLeft size={16} aria-hidden="true" />Back to transfer</Link>}
    <PageHeader title={adding ? 'Add a recipient' : 'Your recipients'} description={adding ? returnToTransfer ? 'Your transfer details are saved. After saving this recipient, you’ll return to your transfer.' : 'Save account details for the people and businesses you pay.' : 'Keep the people and businesses you pay close at hand.'}
      actions={!adding ? <button className="btn-primary" onClick={() => setParams({ add: 'true' })}><Plus size={18} aria-hidden="true" />Add recipient</button> : undefined} />
    <p className="live-notice" role="status">{notice}</p>
    {adding ? <RecipientEditor onCancel={cancel} onSaved={recipient => {
      if (returnToTransfer) navigate(`/transfer?recipient=${recipient.id}&resume=1`);
      else { setParams({}, { replace: true }); setNotice(`${recipient.name} has been added to your recipients.`); setQuery(''); }
    }} /> : <section className="panel">
      <div className="recipient-toolbar"><h2>Saved recipients <span className="count-badge">{recipients.length}</span></h2><div className="search-field"><label htmlFor="recipient-search" className="sr-only">Search recipients</label><Search size={18} aria-hidden="true" /><input id="recipient-search" type="search" placeholder="Search name or bank" value={query} onChange={event => setQuery(event.target.value)} /></div></div>
      {matches.length ? <ul className="recipient-list">{matches.map(item => <li key={item.id}>
        <span className="recipient-avatar" aria-hidden="true"><UserRound size={22} strokeWidth={1.5} /></span>
        <div><Link className="recipient-name" to={`/recipients/${item.id}`}>{item.name}</Link><span className="secondary-line">{item.bank} · Account ending {accountEnding(item.accountNumber)}</span></div>
        <div className="recipient-actions"><Link className="text-link" to={`/recipients/${item.id}`} aria-label={`Manage ${item.name}`}>Manage</Link><Link className="btn-secondary compact" to={`/transfer?recipient=${item.id}`} aria-label={`Send money to ${item.name}`}>Send money<ArrowUpRight size={16} aria-hidden="true" /></Link></div>
      </li>)}</ul> : <EmptyState title={recipients.length ? 'No matching recipients' : 'No recipients yet'} description={recipients.length ? `No recipients match “${query}”. Try another name or bank.` : 'Add a recipient to make your first transfer.'} action={<button className="btn-secondary" onClick={() => recipients.length ? setQuery('') : setParams({ add: 'true' })}>{recipients.length ? 'Clear search' : 'Add recipient'}</button>} />}
    </section>}
  </>;
}
