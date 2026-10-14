import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, CheckCircle2 } from 'lucide-react';
import { useBank } from '../store/useBank';
import { bank, fmtSGD, parseSGD, type Transaction } from '../store/bank';
import { PageHeader } from '../components/BankUI';

export function TransferPage() {
  const { accounts, recipients } = useBank(); const [params] = useSearchParams();
  const depositAccounts = accounts.filter(account => account.type !== 'credit');
  const [fromId, setFromId] = useState(depositAccounts[0]?.id ?? '');
  const [toId, setToId] = useState(params.get('recipient') ?? recipients[0]?.id ?? '');
  const [amount, setAmount] = useState(''); const [memo, setMemo] = useState('');
  const [step, setStep] = useState<'details' | 'review' | 'complete'>('details');
  const [errors, setErrors] = useState<Record<string, string>>({}); const [error, setError] = useState('');
  const [receipt, setReceipt] = useState<Transaction | null>(null); const [sending, setSending] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const from = accounts.find(account => account.id === fromId); const recipient = recipients.find(item => item.id === toId);
  useEffect(() => { if (step !== 'details') heading.current?.focus(); }, [step]);
  function review(event: React.FormEvent) {
    event.preventDefault(); const next: Record<string, string> = {};
    if (!from || from.type === 'credit') next['transfer-from'] = 'Choose a checking or savings account.';
    if (!recipient) next['transfer-to'] = 'Choose a saved recipient before continuing.';
    if (!/^\d+(?:\.\d{1,2})?$/.test(amount.trim()) || Number(amount) <= 0) next['transfer-amount'] = 'Enter an amount greater than zero, with up to two decimal places.';
    else {
      try { if (from && parseSGD(amount) > from.balance) next['transfer-amount'] = `Enter ${fmtSGD(from.balance)} or less, or choose another account.`; }
      catch { next['transfer-amount'] = 'Enter a smaller amount, with up to two decimal places.'; }
    }
    setErrors(next); setError('');
    if (Object.keys(next).length) { requestAnimationFrame(() => document.getElementById(Object.keys(next)[0])?.focus()); return; }
    setStep('review');
  }
  function confirm() {
    if (sending) return; setSending(true); setError('');
    try { const transaction = bank.transfer({ fromAccountId: fromId, toRecipientId: toId, amount: parseSGD(amount), memo: memo.trim() || undefined }); setReceipt(transaction); setStep('complete'); }
    catch (failure) { setError((failure as Error).message); }
    finally { setSending(false); }
  }
  const fieldError = (id: string) => errors[id] ? <p className="field-error" id={`${id}-error`}>{errors[id]}</p> : null;
  return <><PageHeader title="Transfer money" description="Send money from your account to a saved recipient." />
    <ol className="stepper" aria-label="Transfer progress">{['Transfer details', 'Review', 'Complete'].map((label, index) => <li key={label} className={index === ['details', 'review', 'complete'].indexOf(step) ? 'current' : ''} aria-current={index === ['details', 'review', 'complete'].indexOf(step) ? 'step' : undefined}><span>{index + 1}</span>{label}</li>)}</ol>
    <div className="transfer-layout"><section className="panel form-panel">
      {step === 'details' && <form onSubmit={review} noValidate><h2>Transfer details</h2><p className="section-copy">Choose an account, recipient and amount.</p>
        <div className="field"><label htmlFor="transfer-from">From account</label><select id="transfer-from" value={fromId} onChange={event => setFromId(event.target.value)} aria-invalid={Boolean(errors['transfer-from'])} aria-describedby={errors['transfer-from'] ? 'transfer-from-error' : 'available-hint'}>{!depositAccounts.length && <option value="">Choose an account</option>}{depositAccounts.map(account => <option value={account.id} key={account.id}>{account.nickname} · {account.number}</option>)}</select>{fieldError('transfer-from')}<p className="field-hint" id="available-hint">Available balance: {fmtSGD(from?.balance ?? 0)}</p></div>
        <div className="field"><label htmlFor="transfer-to">Recipient</label><select id="transfer-to" value={toId} onChange={event => setToId(event.target.value)} aria-invalid={Boolean(errors['transfer-to'])} aria-describedby={errors['transfer-to'] ? 'transfer-to-error' : undefined}>{!recipients.length && <option value="">Choose a recipient</option>}{recipients.map(item => <option value={item.id} key={item.id}>{item.name} · {item.bank} · {item.accountNumber}</option>)}</select>{fieldError('transfer-to')}<Link className="text-link inline-link" to="/recipients?add=true">Add a new recipient</Link></div>
        <div className="field"><label htmlFor="transfer-amount">Amount (SGD)</label><div className="amount-input"><span aria-hidden="true">S$</span><input id="transfer-amount" type="text" inputMode="decimal" autoComplete="off" placeholder="0.00" value={amount} onChange={event => setAmount(event.target.value)} aria-invalid={Boolean(errors['transfer-amount'])} aria-describedby={errors['transfer-amount'] ? 'transfer-amount-error' : undefined} /></div>{fieldError('transfer-amount')}</div>
        <div className="field"><label htmlFor="transfer-memo">Payment description <span className="optional">Optional</span></label><input id="transfer-memo" name="description" maxLength={80} placeholder="What is this payment for?" value={memo} onChange={event => setMemo(event.target.value)} /></div>
        <button className="btn-primary" type="submit">Review transfer<ArrowRight size={17} aria-hidden="true" /></button>
      </form>}
      {step === 'review' && <><h2 ref={heading} tabIndex={-1}>Review your transfer</h2><p className="section-copy">Check these details before confirming.</p><dl className="review-list"><div><dt>From</dt><dd>{from?.nickname}<span className="secondary-line">Account ending {from?.number}</span></dd></div><div><dt>To</dt><dd>{recipient?.name}<span className="secondary-line">{recipient?.bank} · Account ending {recipient?.accountNumber}</span></dd></div><div><dt>Amount</dt><dd className="review-amount money">{fmtSGD(parseSGD(amount))}</dd></div><div><dt>Transfer fee</dt><dd>{fmtSGD(0)}</dd></div>{memo.trim() && <div><dt>Description</dt><dd>{memo.trim()}</dd></div>}</dl><p className="field-hint">Your balance is updated when the transfer completes.</p>{error && <p className="error-message" role="alert">{error}</p>}<div className="form-actions"><button className="btn-secondary" onClick={() => setStep('details')} disabled={sending}><ArrowLeft size={17} aria-hidden="true" />Edit details</button><button className="btn-primary" onClick={confirm} disabled={sending}>{sending ? 'Sending transfer...' : 'Confirm transfer'}<ArrowRight size={17} aria-hidden="true" /></button></div></>}
      {step === 'complete' && receipt && <div className="receipt"><CheckCircle2 size={42} strokeWidth={1.6} aria-hidden="true" /><h2 ref={heading} tabIndex={-1}>Transfer complete</h2><p>{fmtSGD(receipt.amount)} sent to <strong>{recipient?.name}</strong>.</p><dl className="review-list"><div><dt>Reference</dt><dd className="reference-value" data-testid="transfer-reference">{receipt.id}</dd></div><div><dt>From account</dt><dd>{from?.nickname}</dd></div><div><dt>New available balance</dt><dd className="money" data-testid="transfer-new-balance">{fmtSGD(from?.balance ?? 0)}</dd></div></dl><div className="form-actions"><Link className="btn-primary" to="/transactions">View activity<ArrowRight size={17} aria-hidden="true" /></Link><button className="btn-secondary" onClick={() => { setAmount(''); setMemo(''); setErrors({}); setStep('details'); }}>Make another transfer</button></div></div>}
    </section><aside className="context-panel" aria-label="Transfer information"><h2>{step === 'complete' ? 'Your transfer record' : 'Before you send'}</h2><p>{step === 'complete' ? 'Your transfer has been recorded. Keep its reference for future queries.' : 'Make sure the recipient name and account details are correct.'}</p><dl><div><dt>Currency</dt><dd>Singapore dollar (SGD)</dd></div><div><dt>Transfer fee</dt><dd>{fmtSGD(0)}</dd></div><div><dt>Account type</dt><dd>Checking or savings</dd></div></dl><p>{step === 'complete' ? 'You can find this transfer in your account activity.' : 'You can review and edit the transfer before it is sent.'}</p></aside></div>
  </>;
}
