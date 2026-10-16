import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
export type Employee = { id: string; name: string; role: string; department: string; bank: string; accountEnding: string };
export type Earning = { earningId: string; employeeId: string; description: string; earnedAt: string; amountMinor: number; status: string };
export type Payment = { id: string; employeeId: string; employeeName: string; periodStart: string; amountMinor: number; bank: string; accountEnding: string; createdAt: string };
export type Notification = { id: string; paymentId: string; employeeId: string; employeeName: string; periodStart: string; state: string; attempts: number; lastError: string | null };
export const PAY_DATES = ['2026-10-06', '2026-10-13', '2026-10-20', '2026-10-27', '2026-11-03'];
export type Snapshot = { id: string; company: string; currency: string; period: { start: string; end: string; scheduledFor: string }; employees: Employee[]; earnings: Earning[];
  entries: { employeeId: string; expectedMinor: number; paidMinor: number; earningIds: string[]; paymentCount: number }[]; payments: Payment[]; notifications: Notification[];
  runs: { periodStart: string; periodEnd: string; scheduledFor: string; expectedMinor: number; createdAt: string }[]; locked: boolean; expectedMinor: number; paidMinor: number; pendingApprovals: number; pendingNotifications: number };
export const money = (minor: number) => new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 2 }).format(minor / 100);
export const date = (value: string) => new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
export const time = (value: string) => new Date(value).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' });
export const periodLabel = (start: string, end: string) => `${date(start)} – ${date(new Date(Date.parse(end) - 1).toISOString())}`;
export function amountMinor(value: string) {
  if (!/^\d+(?:\.\d{1,2})?$/.test(value)) throw new Error('Enter a positive amount with up to two decimal places.');
  const [whole, fraction = ''] = value.split('.'); const minor = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  if (!Number.isSafeInteger(minor) || minor <= 0 || minor > 100000000) throw new Error('Enter an amount from ₦0.01 to ₦1,000,000.00.');
  return minor;
}
async function request(path: string, data?: unknown): Promise<Snapshot> {
  const response = await fetch(path, data === undefined ? {} : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
  const body = await response.json(); if (!response.ok) throw new Error(body.error ?? 'Unable to load payroll. Try again.'); return body;
}
type Context = { data: Snapshot | null; busy: boolean; error: string; notice: string; payDate: string; setPayDate: (v: string) => void; reload: () => Promise<void>; act: (action: string, body?: unknown, message?: string) => Promise<boolean> };
const PayrollContext = createContext<Context | null>(null);
export function PayrollProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<Snapshot | null>(null), [busy, setBusy] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState('');
  const [workspace, setWorkspace] = useState(() => new URLSearchParams(location.search).get('workspace') ?? sessionStorage.getItem('mustpayroll.workspace.v1') ?? localStorage.getItem('mustpayroll.workspace.v1') ?? '');
  const [payDate, updatePayDate] = useState(() => {
    const saved = sessionStorage.getItem(`mustpayroll.payDate.${workspace}`);
    return saved && PAY_DATES.includes(saved) ? saved : '2026-10-13';
  });
  function setPayDate(value: string) {
    sessionStorage.setItem(`mustpayroll.payDate.${workspace}`, value);
    updatePayDate(value);
  }
  const scheduledFor = `${payDate}T09:00:00.000Z`;
  async function reload() {
    setError('');
    try { if (workspace) setData(await request(`/api/workspaces/${workspace}?scheduledFor=${encodeURIComponent(scheduledFor)}`)); }
    catch (e) { setError((e as Error).message); }
  }
  useEffect(() => {
    let active = true; setError(''); setNotice(''); setData(null);
    (async () => {
      try {
        if (!workspace) {
          const value = await request('/api/workspaces', { fixture: 'standard' });
          if (active) { sessionStorage.setItem('mustpayroll.workspace.v1', value.id); localStorage.setItem('mustpayroll.workspace.v1', value.id); setWorkspace(value.id); }
        } else {
          const value = await request(`/api/workspaces/${workspace}?scheduledFor=${encodeURIComponent(scheduledFor)}`);
          if (active) { sessionStorage.setItem('mustpayroll.workspace.v1', workspace); localStorage.setItem('mustpayroll.workspace.v1', workspace); setData(value); }
        }
      } catch (e) { if (active) setError((e as Error).message); }
    })(); return () => { active = false; };
  }, [workspace, scheduledFor]);
  async function act(action: string, body: unknown = {}, message = '') {
    if (busy) return false; setBusy(true); setError(''); setNotice('');
    try {
      await request(`/api/workspaces/${workspace}/${action}`, body);
      const next = await request(`/api/workspaces/${workspace}?scheduledFor=${encodeURIComponent(scheduledFor)}`);
      setData(next);
      const mismatch = next.entries.some(entry => entry.paymentCount > 1 || entry.paidMinor > entry.expectedMinor);
      const incomplete = action === 'run' && next.locked && next.paidMinor < next.expectedMinor;
      setNotice(mismatch || incomplete ? '' : message); return true;
    } catch (e) { setError((e as Error).message); return false; } finally { setBusy(false); }
  }
  return <PayrollContext.Provider value={{ data, busy, error, notice, payDate, setPayDate, reload, act }}>{children}</PayrollContext.Provider>;
}
export function usePayroll() { return useContext(PayrollContext)!; }
export function download(name: string, contents: string, type = 'text/plain') {
  const url = URL.createObjectURL(new Blob([contents], { type })); const a = document.createElement('a'); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function csvCell(value: string | number) {
  const text = typeof value === 'string' && /^[=+\-@\t\r]/.test(value) ? `'${value}` : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}
