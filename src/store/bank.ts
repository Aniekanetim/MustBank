// Fictional account state, persisted for repeatable banking assessments.
import { readStoredValue } from './storage';

export type Account = {
  id: string;
  nickname: string;
  type: 'checking' | 'savings' | 'credit';
  number: string;        // last 4 digits, displayed as "•••• 1234"
  balance: number;       // SGD in units of 1/10000; retain fixture precision
  currency: 'SGD';
};

export type Recipient = {
  id: string;
  name: string;
  bank: string;
  accountNumber: string; // full number for new records; legacy records may contain only the last four digits
  archivedAt?: number;
};

export type Transaction = {
  id: string;
  ts: number;            // epoch ms
  fromAccountId: string;
  toRecipientId?: string;
  toAccountId?: string;
  amount: number;        // units of 1/10000 SGD
  memo?: string;
  status: 'completed' | 'pending' | 'failed';
  recipientSnapshot?: { name: string; bank: string; accountNumber: string };
  balanceAfter?: number;
  fee?: number;
};

export type BankState = {
  accounts: Account[];
  recipients: Recipient[];
  transactions: Transaction[];
};

const STORAGE_KEY = 'mustbank.state.v1';

// Fixed fixture time keeps the initial account activity reproducible.
// New simulated transfers use their actual execution time.
const REFERENCE_NOW = new Date('2026-05-06T15:42:00+08:00').getTime();

const SEED: BankState = {
  accounts: [
    { id: 'acc_chk', nickname: 'Everyday Checking', type: 'checking', number: '4071', balance: 482_3500, currency: 'SGD' },
    { id: 'acc_sav', nickname: 'Rainy Day Savings', type: 'savings',  number: '8821', balance: 2_140_0000, currency: 'SGD' },
    { id: 'acc_crd', nickname: 'Travel Credit',     type: 'credit',   number: '0312', balance:   -67_4200, currency: 'SGD' },
  ],
  recipients: [
    { id: 'rcp_meena',  name: 'Meena Iyer',     bank: 'DBS Bank',         accountNumber: '5621' },
    { id: 'rcp_arjun',  name: 'Arjun Pillai',   bank: 'OCBC',             accountNumber: '9034' },
    { id: 'rcp_landlord', name: 'Landlord — 21B Cantonment', bank: 'UOB', accountNumber: '4412' },
    { id: 'rcp_powerco', name: 'SP Group (utilities)', bank: 'Standard Chartered', accountNumber: '7800' },
  ],
  transactions: [
    { id: 't_1', ts: REFERENCE_NOW - 1000 * 60 * 60 * 6,         fromAccountId: 'acc_chk', toRecipientId: 'rcp_powerco', amount:  187_4500, memo: 'Apr utilities',     status: 'completed' },
    { id: 't_2', ts: REFERENCE_NOW - 1000 * 60 * 60 * 24 * 1,    fromAccountId: 'acc_chk', toRecipientId: 'rcp_meena',   amount:   42_0000, memo: 'Dinner split',      status: 'completed' },
    { id: 't_3', ts: REFERENCE_NOW - 1000 * 60 * 60 * 24 * 2,    fromAccountId: 'acc_sav', toAccountId: 'acc_chk',       amount:  500_0000, memo: 'Top up checking',   status: 'completed' },
    { id: 't_4', ts: REFERENCE_NOW - 1000 * 60 * 60 * 24 * 3,    fromAccountId: 'acc_chk', toRecipientId: 'rcp_landlord',amount: 2_400_0000,memo: 'Rent — May',        status: 'completed' },
    { id: 't_5', ts: REFERENCE_NOW - 1000 * 60 * 60 * 24 * 5,    fromAccountId: 'acc_chk', toRecipientId: 'rcp_arjun',   amount:   18_5000, memo: 'Cab share',         status: 'completed' },
  ],
};

export const accountEnding = (number: string) => number.slice(-4);
export const recipientFingerprint = (recipient: Recipient) => JSON.stringify([recipient.id, recipient.name, recipient.bank, recipient.accountNumber]);
export const activeRecipients = (value: BankState) => value.recipients.filter(recipient => !recipient.archivedAt);

function hydrate(value: BankState): BankState {
  return { ...value, transactions: value.transactions.map(transaction => {
    const recipient = value.recipients.find(item => item.id === transaction.toRecipientId);
    return { ...transaction, recipientSnapshot: transaction.recipientSnapshot ?? (recipient ? {
      name: recipient.name, bank: recipient.bank, accountNumber: accountEnding(recipient.accountNumber),
    } : undefined) };
  }) };
}

function load(): BankState {
  try {
    const raw = readStoredValue(STORAGE_KEY, '.state.v1', value => {
      const parsed = JSON.parse(value) as BankState;
      return Array.isArray(parsed.accounts) && Array.isArray(parsed.recipients) && Array.isArray(parsed.transactions)
        && parsed.accounts.some(account => account.id === 'acc_chk');
    });
    if (raw) {
      const parsed = JSON.parse(raw) as BankState;
      const normalized = hydrate(parsed);
      save(normalized);
      return normalized;
    }
  } catch {}
  return hydrate(structuredClone(SEED));
}

function save(state: BankState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

let state: BankState = load();
type Listener = (s: BankState) => void;
const listeners = new Set<Listener>();

function emit() {
  save(state);
  for (const l of listeners) l(state);
}

function readLatest() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) state = hydrate(JSON.parse(raw) as BankState);
}

window.addEventListener('storage', event => {
  if (event.key !== STORAGE_KEY || !event.newValue) return;
  try {
    state = hydrate(JSON.parse(event.newValue) as BankState);
    for (const listener of listeners) listener(state);
  } catch { /* Ignore malformed external storage without replacing valid state. */ }
});

export const bank = {
  get(): BankState { return state; },

  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  reset() {
    state = hydrate(structuredClone(SEED));
    emit();
  },

  findAccount(id: string): Account | undefined {
    return state.accounts.find(a => a.id === id);
  },

  findRecipient(query: string): Recipient[] {
    const q = query.trim().toLowerCase();
    if (!q) return activeRecipients(state);
    return activeRecipients(state).filter(r =>
      r.name.toLowerCase().includes(q) ||
      r.bank.toLowerCase().includes(q) ||
      r.accountNumber.includes(q)
    );
  },

  addRecipient(name: string, bank: string, accountNumber: string): Recipient {
    readLatest();
    const duplicate = activeRecipients(state).find(item => item.bank === bank && item.accountNumber === accountNumber);
    if (duplicate) throw new Error(`This account is already saved as ${duplicate.name}.`);
    const recipient: Recipient = {
      id: `rcp_${crypto.randomUUID()}`,
      name, bank, accountNumber,
    };
    state = { ...state, recipients: [...state.recipients, recipient] };
    emit();
    return recipient;
  },

  updateRecipient(id: string, details: Pick<Recipient, 'name' | 'bank' | 'accountNumber'>): Recipient {
    readLatest();
    const previous = state.recipients.find(item => item.id === id && !item.archivedAt);
    if (!previous) throw new Error('This recipient is no longer available. Choose another recipient.');
    const duplicate = activeRecipients(state).find(item => item.id !== id && item.bank === details.bank && item.accountNumber === details.accountNumber);
    if (duplicate) throw new Error(`This account is already saved as ${duplicate.name}.`);
    const updated = { ...previous, ...details };
    state = { ...state, recipients: state.recipients.map(item => item.id === id ? updated : item) };
    emit();
    return updated;
  },

  removeRecipient(id: string) {
    readLatest();
    state = { ...state, recipients: state.recipients.map(item => item.id === id ? { ...item, archivedAt: Date.now() } : item) };
    emit();
  },

  transfer(opts: {
    fromAccountId: string;
    toRecipientId?: string;
    toAccountId?: string;
    amount: number; // units of 1/10000 SGD
    memo?: string;
    requestId?: string;
    expectedRecipient?: string;
  }): Transaction {
    readLatest();
    const existing = opts.requestId && state.transactions.find(item => item.id === opts.requestId);
    if (existing) {
      if (existing.fromAccountId !== opts.fromAccountId || existing.toRecipientId !== opts.toRecipientId
          || existing.toAccountId !== opts.toAccountId || existing.amount !== opts.amount || existing.memo !== opts.memo) {
        throw new Error('These payment details changed. Start a new transfer.');
      }
      return existing;
    }
    const from = state.accounts.find(a => a.id === opts.fromAccountId);
    if (!from || from.type === 'credit') throw new Error('Choose a checking or savings account.');
    if (!Number.isSafeInteger(opts.amount) || opts.amount <= 0) throw new Error('Enter a valid amount greater than zero.');
    if (Boolean(opts.toRecipientId) === Boolean(opts.toAccountId)) throw new Error('Choose one recipient or destination account.');
    const recipient = activeRecipients(state).find(item => item.id === opts.toRecipientId);
    if (opts.toRecipientId && !recipient) throw new Error('Choose a saved recipient that is still available.');
    if (recipient && opts.expectedRecipient && recipientFingerprint(recipient) !== opts.expectedRecipient) {
      throw new Error('The recipient details changed. Review the transfer again before sending.');
    }
    if (opts.toAccountId && (!state.accounts.some(account => account.id === opts.toAccountId) || opts.toAccountId === opts.fromAccountId)) throw new Error('Choose a different destination account.');
    if (from.balance < opts.amount) {
      throw new Error(`Insufficient funds in ${from.nickname}`);
    }

    const tx: Transaction = {
      id: opts.requestId ?? `t_${crypto.randomUUID()}`,
      ts: Date.now(),
      fromAccountId: opts.fromAccountId,
      toRecipientId: opts.toRecipientId,
      toAccountId: opts.toAccountId,
      amount: opts.amount,
      memo: opts.memo,
      status: 'completed',
      recipientSnapshot: recipient ? { name: recipient.name, bank: recipient.bank, accountNumber: accountEnding(recipient.accountNumber) } : undefined,
      balanceAfter: from.balance - opts.amount,
      fee: 0,
    };

    const accounts = state.accounts.map(a => {
      if (a.id === opts.fromAccountId) return { ...a, balance: a.balance - opts.amount };
      if (a.id === opts.toAccountId)   return { ...a, balance: a.balance + opts.amount };
      return a;
    });

    state = { ...state, accounts, transactions: [tx, ...state.transactions] };
    emit();
    return tx;
  },
};

export function fmtSGD(cents: number): string {
  const dollars = cents / 10000;
  return new Intl.NumberFormat('en-SG', {
    style: 'currency',
    currency: 'SGD',
    minimumFractionDigits: 2,
  }).format(dollars);
}

export function parseSGD(input: string | number): number {
  const value = typeof input === 'string' ? input.trim() : String(input);
  if (!/^\d+(?:\.\d{1,2})?$/.test(value)) throw new Error('Enter an amount with up to two decimal places.');
  const units = Math.round(Number(value) * 10000);
  if (!Number.isSafeInteger(units)) throw new Error('Enter a smaller amount.');
  return units;
}
