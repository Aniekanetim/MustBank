import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { useBank } from '../store/useBank';
import { accountEnding, activeRecipients, bank, fmtSGD, parseSGD, recipientFingerprint } from '../store/bank';
import { clearTransferDraft, initialTransferDraft, saveTransferDraft, type TransferDraft } from '../store/transferDraft';
import { PageHeader } from '../components/BankUI';
import { ConfirmDialog } from '../components/ConfirmDialog';

export function TransferPage() {
  const state = useBank();
  const recipients = activeRecipients(state);
  const accounts = state.accounts.filter(account => account.type !== 'credit');
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [draft, setDraft] = useState(() => initialTransferDraft(
    accounts[0]?.id ?? '', recipients.find(item => item.id === params.get('recipient')),
    params.get('new') !== '1' && (!params.has('recipient') || params.get('resume') === '1'),
  ));
  const [step, setStep] = useState<'details' | 'review'>('details');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [sending, setSending] = useState(false);
  const [discarding, setDiscarding] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const confirming = useRef(false);
  const reviewedRecipient = useRef('');
  const firstRender = useRef(true);
  const from = accounts.find(item => item.id === draft.fromId);
  const recipient = recipients.find(item => item.id === draft.toId);
  const hasDraft = Boolean(draft.toId || draft.amount || draft.memo);

  useEffect(() => saveTransferDraft(draft), [draft]);
  useEffect(() => {
    if (firstRender.current) { firstRender.current = false; return; }
    heading.current?.focus();
  }, [step]);
  useEffect(() => {
    if (!draft.toId) return;
    if (!recipient || recipientFingerprint(recipient) !== draft.recipientVersion) {
      setDraft(value => ({ ...value, toId: '', recipientVersion: '' }));
      setStep('details');
      setNotice('The saved recipient details changed. Choose a recipient again before continuing. Your amount and description are saved.');
    }
  }, [state.recipients, draft.toId, draft.recipientVersion]);

  function change(patch: Partial<TransferDraft>) {
    setDraft(value => ({ ...value, ...patch }));
    setError('');
  }
  function review(event: React.FormEvent) {
    event.preventDefault();
    const next: Record<string, string> = {};
    if (!from) next['transfer-from'] = 'Choose a checking or savings account.';
    if (!recipient) next['transfer-to'] = 'Choose the recipient you want to pay.';
    try {
      if (parseSGD(draft.amount) <= 0) throw new Error('positive');
      if (from && parseSGD(draft.amount) > from.balance) next['transfer-amount'] = `Enter ${fmtSGD(from.balance)} or less, or choose another account.`;
    } catch { next['transfer-amount'] = 'Enter an amount greater than zero, with up to two decimal places.'; }
    setErrors(next); setError('');
    if (Object.keys(next).length) {
      requestAnimationFrame(() => document.getElementById(Object.keys(next)[0])?.focus());
      return;
    }
    reviewedRecipient.current = recipientFingerprint(recipient!);
    setStep('review');
  }
  function confirm() {
    if (confirming.current) return;
    confirming.current = true; setSending(true); setError('');
    try {
      const transaction = bank.transfer({
        fromAccountId: draft.fromId, toRecipientId: draft.toId, amount: parseSGD(draft.amount),
        memo: draft.memo.trim() || undefined, requestId: draft.id, expectedRecipient: reviewedRecipient.current,
      });
      clearTransferDraft();
      navigate(`/transactions/${transaction.id}?completed=1`, { replace: true });
    } catch (failure) {
      setError((failure as Error).message);
      confirming.current = false; setSending(false);
    }
  }
  const fieldError = (id: string) => errors[id] ? <p className="field-error" id={`${id}-error`}>{errors[id]}</p> : null;
  return <>
    <PageHeader title="Transfer money" description="Send money from your account to a saved recipient."
      actions={hasDraft ? <span className="draft-status"><Check size={16} aria-hidden="true" />Draft saved in this tab</span> : undefined} />
    <ol className="stepper" aria-label="Transfer progress">
      {['Details', 'Review', 'Complete'].map((label, index) => <li key={label} className={index === (step === 'details' ? 0 : 1) ? 'current' : ''} aria-current={index === (step === 'details' ? 0 : 1) ? 'step' : undefined}><span>{index + 1}</span>{label}</li>)}
    </ol>
    <p className="live-notice" role="status">{notice}</p>
    <div className="transfer-layout"><section className="panel form-panel">
      {step === 'details' ? <form onSubmit={review} noValidate>
        <h2 ref={heading} tabIndex={-1}>Transfer details</h2><p className="section-copy">Choose an account, recipient and amount.</p>
        <div className="field"><label htmlFor="transfer-from">From account</label>
          <select id="transfer-from" value={draft.fromId} onChange={event => change({ fromId: event.target.value })} aria-invalid={Boolean(errors['transfer-from'])} aria-describedby={errors['transfer-from'] ? 'transfer-from-error' : 'available-hint'}>
            {!from && <option value="">Choose an account</option>}
            {accounts.map(account => <option value={account.id} key={account.id}>{account.nickname} · {account.number}</option>)}
          </select>{fieldError('transfer-from')}<p className="field-hint" id="available-hint">Available balance: {fmtSGD(from?.balance ?? 0)}</p>
        </div>
        <div className="field"><label htmlFor="transfer-to">Recipient</label>
          <select id="transfer-to" value={draft.toId} onChange={event => {
            const selected = recipients.find(item => item.id === event.target.value);
            change({ toId: selected?.id ?? '', recipientVersion: selected ? recipientFingerprint(selected) : '' });
          }} aria-invalid={Boolean(errors['transfer-to'])} aria-describedby={errors['transfer-to'] ? 'transfer-to-error' : undefined}>
            <option value="">Choose a recipient</option>
            {recipients.map(item => <option value={item.id} key={item.id}>{item.name} · {item.bank} · {accountEnding(item.accountNumber)}</option>)}
          </select>{fieldError('transfer-to')}
          <Link className="text-link inline-link" to="/recipients?add=true&returnTo=transfer">Add a new recipient</Link>
        </div>
        <div className="field"><label htmlFor="transfer-amount">Amount (SGD)</label><div className="amount-input"><span aria-hidden="true">S$</span><input id="transfer-amount" type="text" inputMode="decimal" autoComplete="off" placeholder="0.00" value={draft.amount} onChange={event => change({ amount: event.target.value })} aria-invalid={Boolean(errors['transfer-amount'])} aria-describedby={errors['transfer-amount'] ? 'transfer-amount-error' : undefined} /></div>{fieldError('transfer-amount')}</div>
        <div className="field"><label htmlFor="transfer-memo">Payment description <span className="optional">Optional</span></label><input id="transfer-memo" maxLength={80} placeholder="What is this payment for?" value={draft.memo} onChange={event => change({ memo: event.target.value })} /></div>
        <div className="form-actions"><button className="btn-primary" type="submit">Review transfer<ArrowRight size={17} aria-hidden="true" /></button><Link className="btn-secondary" to="/dashboard">Save and exit</Link></div>
        {hasDraft && <button className="text-link discard-link" type="button" onClick={() => setDiscarding(true)}>Discard draft</button>}
      </form> : <>
        <h2 ref={heading} tabIndex={-1}>Review your transfer</h2><p className="section-copy">Check the recipient and amount before sending.</p>
        <dl className="review-list">
          <div><dt>From</dt><dd>{from?.nickname}<span className="secondary-line">Account ending {from?.number}</span></dd></div>
          <div><dt>To</dt><dd>{recipient?.name}<span className="secondary-line">{recipient?.bank} · Account ending {recipient ? accountEnding(recipient.accountNumber) : ''}</span></dd></div>
          <div><dt>Amount</dt><dd className="review-amount money">{fmtSGD(parseSGD(draft.amount))}</dd></div>
          <div><dt>Transfer fee</dt><dd>{fmtSGD(0)}</dd></div>
          <div><dt>Balance after transfer</dt><dd className="money">{fmtSGD((from?.balance ?? 0) - parseSGD(draft.amount))}</dd></div>
          {draft.memo.trim() && <div><dt>Description</dt><dd>{draft.memo.trim()}</dd></div>}
        </dl>
        {error && <p className="error-message" role="alert">{error}</p>}
        <div className="form-actions"><button className="btn-secondary" onClick={() => setStep('details')} disabled={sending}><ArrowLeft size={17} aria-hidden="true" />Edit details</button><button className="btn-primary" onClick={confirm} disabled={sending}>{sending ? 'Sending transfer…' : 'Confirm transfer'}<ArrowRight size={17} aria-hidden="true" /></button></div>
      </>}
    </section><aside className="context-panel" aria-label="Transfer information"><h2>Before you send</h2><p>Check the recipient name, bank and account ending. Your money is sent when you confirm the transfer.</p><dl><div><dt>Currency</dt><dd>Singapore dollar (SGD)</dd></div><div><dt>Transfer fee</dt><dd>{fmtSGD(0)}</dd></div></dl><p>Need to add a recipient? Your transfer details stay saved while you do.</p></aside></div>
    <ConfirmDialog open={discarding} title="Discard this transfer draft?" description="The amount, recipient and description in this draft will be cleared. No money has been sent." confirmLabel="Discard draft" cancelLabel="Keep draft" onCancel={() => setDiscarding(false)} onConfirm={() => {
      clearTransferDraft(); setDraft(initialTransferDraft(accounts[0]?.id ?? '', undefined, false)); setErrors({}); setDiscarding(false); setNotice('Draft discarded. No money was sent.');
    }} />
  </>;
}
