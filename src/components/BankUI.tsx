import type { ReactNode } from 'react';
import { ArrowUpRight, ArrowLeftRight, Inbox } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { fmtSGD, type BankState, type Transaction } from '../store/bank';

export function PageHeader({ eyebrow, title, description, actions }: { eyebrow?: string; title: string; description: string; actions?: ReactNode }) {
  return <header className="page-header"><div>{eyebrow && <p className="eyebrow">{eyebrow}</p>}<h1 id="page-title" tabIndex={-1}>{title}</h1><p className="page-description">{description}</p></div>{actions && <div className="header-actions">{actions}</div>}</header>;
}
export function StatusPill({ status, label }: { status: string; label?: string }) {
  const tone = ['completed', 'paid', 'sent'].includes(status) ? 'success' : ['failed', 'cancelled'].includes(status) ? 'danger' : 'pending';
  return <span className={`status-pill ${tone}`}><span aria-hidden="true" />{label ?? status.charAt(0).toUpperCase() + status.slice(1)}</span>;
}
export function EmptyState({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return <div className="empty-state"><Inbox size={28} strokeWidth={1.5} aria-hidden="true" /><h3>{title}</h3><p>{description}</p>{action}</div>;
}
export function recipientName(transaction: Transaction, state: BankState) {
  return transaction.toRecipientId ? transaction.recipientSnapshot?.name ?? state.recipients.find(item => item.id === transaction.toRecipientId)?.name ?? 'Recipient'
    : state.accounts.find(item => item.id === transaction.toAccountId)?.nickname ?? 'Your account';
}
export function ActivityTable({ transactions, state, accountId }: { transactions: Transaction[]; state: BankState; accountId?: string }) {
  const location = useLocation();
  const returnTo = location.pathname === '/transactions' ? `${location.pathname}${location.search}` : '/transactions';
  return <div className="table-wrap"><table className="data-table activity-table"><caption className="sr-only">Account activity, dates, amounts and status</caption>
    <thead><tr><th scope="col">Transaction</th><th scope="col" className="date-column">Date</th><th scope="col" className="status-column">Status</th><th scope="col" className="amount-column">Amount</th></tr></thead>
    <tbody>{transactions.map(transaction => {
      const from = state.accounts.find(item => item.id === transaction.fromAccountId);
      const internal = Boolean(transaction.toAccountId);
      const incoming = Boolean(accountId && transaction.toAccountId === accountId);
      const outgoing = !internal || Boolean(accountId && transaction.fromAccountId === accountId);
      const direction = transaction.status === 'failed' ? 'Not sent' : incoming ? 'Money in' : outgoing ? 'Money out' : 'Between your accounts';
      const sign = transaction.status === 'failed' ? '' : incoming ? '+' : outgoing ? '−' : '';
      const title = transaction.memo || `Transfer to ${recipientName(transaction, state)}`;
      const date = new Date(transaction.ts).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
      return <tr key={transaction.id}><td><div className="activity-detail"><span className="row-icon" aria-hidden="true">{internal ? <ArrowLeftRight size={18} /> : <ArrowUpRight size={18} />}</span><div><Link className="transaction-link" to={`/transactions/${transaction.id}`} state={{ returnTo }} aria-label={`View payment details for ${title}`}>{title}</Link><span className="secondary-line">{from?.nickname} {internal ? 'to' : '→'} {recipientName(transaction, state)}</span><span className="mobile-detail">{date} · {transaction.status}</span></div></div></td>
        <td className="date-column">{date}<span className="secondary-line">{new Date(transaction.ts).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</span></td>
        <td className="status-column"><StatusPill status={transaction.status} /></td><td className="amount-column"><strong className={`money${incoming ? ' amount-in' : ''}`}>{sign}{fmtSGD(transaction.amount)}</strong><span className="secondary-line">{direction}</span></td></tr>;
    })}</tbody></table></div>;
}
export function PanelHeading({ title, description, link, id }: { title: string; description?: string; id?: string; link?: { to: string; text: string } }) {
  return <div className="panel-heading"><div><h2 id={id}>{title}</h2>{description && <p>{description}</p>}</div>{link && <Link className="text-link" to={link.to}>{link.text}<ArrowUpRight size={16} aria-hidden="true" /></Link>}</div>;
}
export function csvCell(value: string | number) {
  let text = String(value);
  if (typeof value === 'string' && /^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}
export function downloadFile(name: string, contents: string, type: string) {
  const url = URL.createObjectURL(new Blob([contents], { type }));
  const link = document.createElement('a'); link.href = url; link.download = name; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
