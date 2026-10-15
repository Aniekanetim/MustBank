import { useState } from 'react';
import { Link, useLocation, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, CheckCircle2, Copy, Download } from 'lucide-react';
import { EmptyState, PageHeader, recipientName, StatusPill, downloadFile } from '../components/BankUI';
import { fmtSGD } from '../store/bank';
import { useBank } from '../store/useBank';

export function ReceiptPage() {
  const state = useBank();
  const { id } = useParams();
  const [params] = useSearchParams();
  const location = useLocation();
  const [notice, setNotice] = useState('');
  const transaction = state.transactions.find(item => item.id === id);
  const returnTo = typeof location.state?.returnTo === 'string' && /^\/transactions(?:\?|$)/.test(location.state.returnTo) ? location.state.returnTo : '/transactions';
  if (!transaction) return <><PageHeader title="Payment not found" description="This payment is not available in your account activity." /><section className="panel"><EmptyState title="Check your payment history" description="Find the payment in account activity and open its details." action={<Link className="btn-primary" to="/transactions">View activity</Link>} /></section></>;
  const from = state.accounts.find(item => item.id === transaction.fromAccountId);
  const to = state.accounts.find(item => item.id === transaction.toAccountId);
  const recipient = transaction.recipientSnapshot ?? state.recipients.find(item => item.id === transaction.toRecipientId);
  const name = recipientName(transaction, state);
  const completed = params.get('completed') === '1' && transaction.status === 'completed';
  const date = new Date(transaction.ts).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZoneName: 'short' });
  const receiptText = [
    'MustBank payment receipt', `Reference: ${transaction.id}`, `Status: ${transaction.status}`,
    `Date: ${date}`, `Date (UTC): ${new Date(transaction.ts).toISOString()}`,
    `From: ${from?.nickname ?? 'Account'} · account ending ${from?.number ?? ''}`,
    `To: ${name}`, recipient ? `Bank: ${recipient.bank} · account ending ${recipient.accountNumber.slice(-4)}` : `Account ending ${to?.number ?? ''}`,
    `Amount: SGD ${fmtSGD(transaction.amount)}`, `Fee: SGD ${fmtSGD(transaction.fee ?? 0)}`,
    ...(transaction.memo ? [`Description: ${transaction.memo}`] : []),
    ...(transaction.balanceAfter !== undefined ? [`Balance after transfer: SGD ${fmtSGD(transaction.balanceAfter)}`] : []),
  ].join('\n');
  async function copy() {
    try { await navigator.clipboard.writeText(transaction!.id); setNotice('Reference copied.'); }
    catch { setNotice('Select the reference below and copy it using your browser.'); }
  }
  return <>
    <Link className="text-link back-link" to={returnTo}><ArrowLeft size={16} aria-hidden="true" />Back to activity</Link>
    <PageHeader title={completed ? 'Transfer complete' : 'Payment details'} description={completed ? 'Your payment has been recorded. You can return to this receipt from account activity.' : 'Your payment record and reference, in one place.'} />
    {completed && <ol className="stepper" aria-label="Transfer progress"><li><span>1</span>Details</li><li><span>2</span>Review</li><li className="current" aria-current="step"><span>3</span>Complete</li></ol>}
    <div className="transfer-layout"><section className="panel form-panel receipt" aria-labelledby="receipt-heading">
      {transaction.status === 'completed' && <CheckCircle2 size={38} strokeWidth={1.6} aria-hidden="true" />}
      <h2 id="receipt-heading">Payment receipt</h2><p><strong className="money">{fmtSGD(transaction.amount)}</strong> {transaction.status === 'completed' ? 'sent to' : 'payable to'} <strong>{name}</strong>.</p>
      <dl className="review-list">
        <div><dt>Status</dt><dd><StatusPill status={transaction.status} /></dd></div>
        <div><dt>Date and time</dt><dd><time dateTime={new Date(transaction.ts).toISOString()}>{date}</time></dd></div>
        <div><dt>From account</dt><dd>{from?.nickname}<span className="secondary-line">Account ending {from?.number}</span></dd></div>
        <div><dt>To</dt><dd>{name}<span className="secondary-line">{recipient ? `${recipient.bank} · Account ending ${recipient.accountNumber.slice(-4)}` : `Account ending ${to?.number}`}</span></dd></div>
        <div><dt>Amount (SGD)</dt><dd className="money">{fmtSGD(transaction.amount)}</dd></div>
        <div><dt>Transfer fee</dt><dd className="money">{fmtSGD(transaction.fee ?? 0)}</dd></div>
        {transaction.memo && <div><dt>Description</dt><dd>{transaction.memo}</dd></div>}
        {transaction.balanceAfter !== undefined && <div><dt>Balance after this transfer</dt><dd className="money" data-testid="transfer-new-balance">{fmtSGD(transaction.balanceAfter)}</dd></div>}
        <div className="receipt-reference"><dt>Reference</dt><dd className="reference-value" data-testid="transfer-reference">{transaction.id}</dd></div>
      </dl>
      <p className="live-notice" role="status">{notice}</p>
      <div className="form-actions receipt-tools"><button className="btn-secondary" onClick={copy}><Copy size={16} aria-hidden="true" />Copy reference</button><button className="btn-secondary" onClick={() => downloadFile(`mustbank-receipt-${transaction.id}.txt`, receiptText, 'text/plain;charset=utf-8')}><Download size={16} aria-hidden="true" />Download receipt</button></div>
      <div className="form-actions"><Link className="btn-primary" to={returnTo}>View activity<ArrowRight size={17} aria-hidden="true" /></Link><Link className="btn-secondary" to="/transfer?new=1">Make another transfer</Link></div>
    </section><aside className="context-panel receipt-context" aria-label="Account balance"><h2>Available now</h2><p>{from?.nickname} · {from?.number}</p><strong className="account-balance money">{fmtSGD(from?.balance ?? 0)}</strong><p>This is your current available balance. The receipt records the balance at the time of this transfer, when available.</p><p>Keep your reference if you need to query this payment.</p></aside></div>
  </>;
}
