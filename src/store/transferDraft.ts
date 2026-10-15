import { recipientFingerprint, type Recipient } from './bank';

const KEY = 'mustbank.transfer.draft.v1';
export type TransferDraft = {
  id: string;
  fromId: string;
  toId: string;
  amount: string;
  memo: string;
  recipientVersion: string;
};

export function readTransferDraft(): TransferDraft | null {
  try {
    const value = JSON.parse(sessionStorage.getItem(KEY) ?? 'null');
    if (value && typeof value.id === 'string' && value.id.startsWith('t_')
        && ['fromId', 'toId', 'amount', 'memo', 'recipientVersion'].every(key => typeof value[key] === 'string')) return value;
  } catch { /* A damaged draft does not replace the account ledger. */ }
  return null;
}

export function initialTransferDraft(fromId: string, recipient?: Recipient, resume = true): TransferDraft {
  const previous = resume ? readTransferDraft() : null;
  const draft = previous ?? { id: `t_${crypto.randomUUID()}`, fromId, toId: '', amount: '', memo: '', recipientVersion: '' };
  return recipient ? { ...draft, toId: recipient.id, recipientVersion: recipientFingerprint(recipient) } : draft;
}

export function saveTransferDraft(value: TransferDraft) { sessionStorage.setItem(KEY, JSON.stringify(value)); }
export function clearTransferDraft() { sessionStorage.removeItem(KEY); }
