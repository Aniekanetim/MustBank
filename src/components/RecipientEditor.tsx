import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { accountEnding, bank, type Recipient } from '../store/bank';

export function RecipientEditor({ initial, onSaved, onCancel }: {
  initial?: Recipient; onSaved: (recipient: Recipient) => void; onCancel: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [bankName, setBankName] = useState(initial?.bank ?? '');
  const [number, setNumber] = useState('');
  const [reviewing, setReviewing] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { heading.current?.focus(); }, [reviewing]);
  const candidate = { name: name.trim(), bank: bankName, accountNumber: number.trim() || initial?.accountNumber || '' };
  function review(event: React.FormEvent) {
    event.preventDefault();
    const next: Record<string, string> = {};
    if (name.trim().length < 2) next['recipient-name'] = 'Enter the recipient’s full name or business name.';
    if (!bankName) next['recipient-bank'] = 'Choose the recipient’s bank.';
    if ((!initial || number.trim() || bankName !== initial.bank) && !/^\d{4,18}$/.test(number.trim())) next['recipient-account'] = 'Enter an account number containing 4 to 18 digits.';
    setErrors(next); setError('');
    if (Object.keys(next).length) { requestAnimationFrame(() => document.getElementById(Object.keys(next)[0])?.focus()); return; }
    setReviewing(true);
  }
  function save() {
    try {
      const recipient = initial ? bank.updateRecipient(initial.id, candidate) : bank.addRecipient(candidate.name, candidate.bank, candidate.accountNumber);
      onSaved(recipient);
    } catch (failure) { setError((failure as Error).message); }
  }
  const fieldError = (id: string) => errors[id] ? <p className="field-error" id={`${id}-error`}>{errors[id]}</p> : null;
  return <section className="panel recipient-form-panel">
    {reviewing ? <>
      <h2 ref={heading} tabIndex={-1}>{initial ? 'Review recipient changes' : 'Review recipient'}</h2>
      <p className="section-copy">Check the name, bank and account before saving.</p>
      <dl className="review-list"><div><dt>Recipient</dt><dd>{candidate.name}</dd></div><div><dt>Bank</dt><dd>{candidate.bank}</dd></div><div><dt>{number.trim() ? 'Account number' : 'Account ending'}</dt><dd className="reference-value">{number.trim() || accountEnding(candidate.accountNumber)}</dd></div></dl>
      {initial && <p className="field-hint">Changes apply to future transfers. Earlier payment receipts keep their original details.</p>}
      {error && <p className="error-message" role="alert">{error}</p>}
      <div className="form-actions"><button className="btn-secondary" onClick={() => setReviewing(false)}><ArrowLeft size={16} aria-hidden="true" />Edit details</button><button className="btn-primary" onClick={save}>{initial ? 'Save changes' : 'Save recipient'}<ArrowRight size={16} aria-hidden="true" /></button></div>
    </> : <form onSubmit={review} noValidate>
      <h2 ref={heading} tabIndex={-1}>Recipient details</h2><p className="section-copy">Use the account details provided by the person or business you’re paying.</p>
      <div className="recipient-form">
        <div className="field"><label htmlFor="recipient-name">Recipient name</label><input id="recipient-name" name="recipient-name" autoComplete="name" maxLength={80} placeholder="Full name or business name" value={name} onChange={event => setName(event.target.value)} aria-invalid={Boolean(errors['recipient-name'])} aria-describedby={errors['recipient-name'] ? 'recipient-name-error' : undefined} />{fieldError('recipient-name')}</div>
        <div className="field"><label htmlFor="recipient-bank">Bank</label><select id="recipient-bank" value={bankName} onChange={event => setBankName(event.target.value)} aria-invalid={Boolean(errors['recipient-bank'])} aria-describedby={errors['recipient-bank'] ? 'recipient-bank-error' : undefined}><option value="">Choose a bank</option>{['DBS Bank', 'OCBC', 'UOB', 'Standard Chartered'].map(value => <option key={value}>{value}</option>)}</select>{fieldError('recipient-bank')}</div>
        <div className="field"><label htmlFor="recipient-account">Account number</label><input id="recipient-account" name="account-number" inputMode="numeric" autoComplete="off" maxLength={18} placeholder={initial ? 'Enter a replacement account number' : 'Enter account number'} value={number} onChange={event => setNumber(event.target.value)} aria-invalid={Boolean(errors['recipient-account'])} aria-describedby={errors['recipient-account'] ? 'recipient-account-error' : 'recipient-account-hint'} />{fieldError('recipient-account')}<p className="field-hint" id="recipient-account-hint">{initial ? `Current account ends in ${accountEnding(initial.accountNumber)}. Leave blank to keep this account, or enter a replacement.` : 'You’ll review the account number before saving. Saved lists show only the last four digits.'}</p></div>
        <div className="form-actions"><button className="btn-primary" type="submit">{initial ? 'Review changes' : 'Review recipient'}<ArrowRight size={16} aria-hidden="true" /></button><button className="btn-secondary" type="button" onClick={onCancel}>Cancel</button></div>
      </div>
    </form>}
  </section>;
}
