import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowUpRight, Plus, Search, UserRound } from 'lucide-react';
import { useBank } from '../store/useBank';
import { bank } from '../store/bank';
import { EmptyState, PageHeader } from '../components/BankUI';

export function RecipientsPage() {
  const { recipients } = useBank(); const [params] = useSearchParams();
  const [adding, setAdding] = useState(params.get('add') === 'true'); const [query, setQuery] = useState('');
  const [name, setName] = useState(''); const [bankName, setBankName] = useState('DBS Bank'); const [number, setNumber] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({}); const [notice, setNotice] = useState('');
  const matches = recipients.filter(item => `${item.name} ${item.bank} ${item.accountNumber}`.toLowerCase().includes(query.toLowerCase().trim()));
  function submit(event: React.FormEvent) {
    event.preventDefault(); const next: Record<string, string> = {};
    if (name.trim().length < 2) next['recipient-name'] = 'Enter the recipient’s name.';
    if (!/^\d{4,18}$/.test(number.trim())) next['recipient-account'] = 'Enter an account number containing 4 to 18 digits.';
    setErrors(next); setNotice('');
    if (Object.keys(next).length) { requestAnimationFrame(() => document.getElementById(Object.keys(next)[0])?.focus()); return; }
    bank.addRecipient(name.trim(), bankName, number.trim().slice(-4));
    setNotice(`${name.trim()} has been added to your recipients.`); setName(''); setNumber(''); setAdding(false); setQuery('');
  }
  return <><PageHeader title="Your recipients" description="Keep the people and businesses you pay close at hand." actions={adding ? <button className="btn-secondary" onClick={() => setAdding(false)}>Cancel</button> : <button className="btn-primary" onClick={() => setAdding(true)}><Plus size={18} aria-hidden="true" />Add recipient</button>} />
    <p className="live-notice" role="status">{notice}</p>
    {adding && <section className="panel recipient-form-panel"><h2>Add a recipient</h2><p className="section-copy">Their account details will be available when you make a transfer.</p><form className="recipient-form" onSubmit={submit} noValidate>
      <div className="field"><label htmlFor="recipient-name">Recipient name</label><input id="recipient-name" name="recipient-name" autoComplete="name" maxLength={80} placeholder="Full name or business name" value={name} onChange={event => setName(event.target.value)} aria-invalid={Boolean(errors['recipient-name'])} aria-describedby={errors['recipient-name'] ? 'recipient-name-error' : undefined} />{errors['recipient-name'] && <p className="field-error" id="recipient-name-error">{errors['recipient-name']}</p>}</div>
      <div className="field"><label htmlFor="recipient-bank">Bank</label><select id="recipient-bank" value={bankName} onChange={event => setBankName(event.target.value)}>{['DBS Bank', 'OCBC', 'UOB', 'Standard Chartered'].map(value => <option key={value}>{value}</option>)}</select></div>
      <div className="field"><label htmlFor="recipient-account">Account number</label><input id="recipient-account" name="account-number" inputMode="numeric" autoComplete="off" maxLength={18} placeholder="Enter account number" value={number} onChange={event => setNumber(event.target.value)} aria-invalid={Boolean(errors['recipient-account'])} aria-describedby={errors['recipient-account'] ? 'recipient-account-error' : 'recipient-account-hint'} />{errors['recipient-account'] && <p className="field-error" id="recipient-account-error">{errors['recipient-account']}</p>}<p className="field-hint" id="recipient-account-hint">Only the last four digits are shown once saved.</p></div>
      <div className="form-actions"><button className="btn-primary" type="submit">Save recipient<ArrowUpRight size={17} aria-hidden="true" /></button></div>
    </form></section>}
    <section className="panel"><div className="recipient-toolbar"><h2>Saved recipients <span className="count-badge">{recipients.length}</span></h2><div className="search-field"><label htmlFor="recipient-search" className="sr-only">Search recipients</label><Search size={18} aria-hidden="true" /><input id="recipient-search" type="search" placeholder="Search name or bank" value={query} onChange={event => setQuery(event.target.value)} /></div></div>
      {matches.length ? <ul className="recipient-list">{matches.map(item => <li key={item.id}><span className="recipient-avatar" aria-hidden="true"><UserRound size={22} strokeWidth={1.5} /></span><div><strong>{item.name}</strong><span className="secondary-line">{item.bank} · Account ending {item.accountNumber}</span></div><Link className="btn-secondary compact" to={`/transfer?recipient=${encodeURIComponent(item.id)}`} aria-label={`Send money to ${item.name}`}>Send money<ArrowUpRight size={16} aria-hidden="true" /></Link></li>)}</ul> : <EmptyState title={recipients.length ? 'No matching recipients' : 'No recipients yet'} description={recipients.length ? 'Try another name or bank.' : 'Add a recipient to make your first transfer.'} action={<button className="btn-secondary" onClick={() => recipients.length ? setQuery('') : setAdding(true)}>{recipients.length ? 'Clear search' : 'Add recipient'}</button>} />}
    </section></>;
}
