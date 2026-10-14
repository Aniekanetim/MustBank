import { useState } from 'react';
import { useBank } from '../store/useBank';
import { bank } from '../store/bank';

export function RecipientsPage() {
  const { recipients } = useBank();
  const [name, setName] = useState('');
  const [bankName, setBankName] = useState('');
  const [accNum, setAccNum] = useState('');

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !bankName || !accNum) return;
    bank.addRecipient(name, bankName, accNum.slice(-4));
    setName(''); setBankName(''); setAccNum('');
  }

  return (
    <>
      <h1 className="page-title">Saved recipients</h1>
      <p className="page-sub">Manage the fictional payees available for your transfer tests.</p>

      <h2 className="section-title">Existing</h2>
      <div className="list">
        {recipients.map(r => (
          <div key={r.id} className="recipient-row">
            <div>
              <div style={{ fontWeight: 600 }}>{r.name}</div>
              <div className="meta">id: {r.id}</div>
            </div>
            <div>{r.bank}</div>
            <div style={{ textAlign: 'right' }}>•••• {r.accountNumber}</div>
          </div>
        ))}
      </div>

      <h2 className="section-title" style={{ marginTop: 28 }}>Add new</h2>
      <form className="form" onSubmit={submit}>
        <div className="form-row">
          <label htmlFor="recipient-name">Name</label>
          <input id="recipient-name" type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Priya Menon" />
        </div>
        <div className="form-row">
          <label htmlFor="recipient-bank">Bank</label>
          <input id="recipient-bank" type="text" value={bankName} onChange={e => setBankName(e.target.value)} placeholder="e.g. DBS Bank" />
        </div>
        <div className="form-row">
          <label htmlFor="recipient-account">Account number (last 4)</label>
          <input id="recipient-account" type="text" value={accNum} onChange={e => setAccNum(e.target.value)} maxLength={4} placeholder="1234" />
        </div>
        <button type="submit" className="btn-primary">Save recipient</button>
      </form>
    </>
  );
}
