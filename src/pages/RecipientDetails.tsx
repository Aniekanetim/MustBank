import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowUpRight, Pencil, Trash2 } from 'lucide-react';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { EmptyState, PageHeader } from '../components/BankUI';
import { RecipientEditor } from '../components/RecipientEditor';
import { accountEnding, bank } from '../store/bank';
import { useBank } from '../store/useBank';

export function RecipientDetailsPage() {
  const state = useBank();
  const { id } = useParams();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [notice, setNotice] = useState('');
  const recipient = state.recipients.find(item => item.id === id && !item.archivedAt);
  if (!recipient) return <><PageHeader title="Recipient unavailable" description="This recipient may have been removed from your saved list." /><section className="panel"><EmptyState title="Choose a saved recipient" description="Your earlier payment receipts remain in account activity." action={<Link className="btn-primary" to="/recipients">View recipients</Link>} /></section></>;
  return <>
    <Link className="text-link back-link" to="/recipients"><ArrowLeft size={16} aria-hidden="true" />Back to recipients</Link>
    <PageHeader title={editing ? 'Edit recipient' : recipient.name} description={editing ? 'Review changes before updating this recipient.' : 'Manage saved details and view earlier payments.'} actions={!editing ? <Link className="btn-primary" to={`/transfer?recipient=${recipient.id}`}>Send money<ArrowUpRight size={16} aria-hidden="true" /></Link> : undefined} />
    <p className="live-notice" role="status">{notice}</p>
    {editing ? <RecipientEditor initial={recipient} onCancel={() => setEditing(false)} onSaved={() => { setEditing(false); setNotice('Recipient updated. Earlier payment receipts are unchanged.'); }} /> : <section className="panel recipient-details-panel">
      <h2>Saved account</h2><dl className="review-list"><div><dt>Recipient name</dt><dd>{recipient.name}</dd></div><div><dt>Bank</dt><dd>{recipient.bank}</dd></div><div><dt>Account ending</dt><dd>{accountEnding(recipient.accountNumber)}</dd></div></dl>
      <div className="form-actions"><button className="btn-secondary" onClick={() => setEditing(true)}><Pencil size={16} aria-hidden="true" />Edit recipient</button><Link className="btn-secondary" to={`/transactions?recipient=${recipient.id}`}>View payment history</Link></div>
      <div className="recipient-danger-zone"><h3>Remove from saved recipients</h3><p>Earlier payments and receipts will stay in your account activity.</p><button className="btn-danger-outline" onClick={() => setRemoving(true)}><Trash2 size={16} aria-hidden="true" />Remove recipient</button></div>
    </section>}
    <ConfirmDialog open={removing} title={`Remove ${recipient.name}?`} description="This recipient will no longer appear when you choose who to pay. Earlier payments and receipts will remain available." confirmLabel="Remove recipient" cancelLabel="Keep recipient" onCancel={() => setRemoving(false)} onConfirm={() => { bank.removeRecipient(recipient.id); navigate('/recipients', { replace: true, state: { notice: `${recipient.name} was removed. Earlier payment receipts are unchanged.` } }); }} />
  </>;
}
