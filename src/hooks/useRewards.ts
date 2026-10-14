import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { readStoredValue } from '../store/storage';

export type RewardTask = { taskId: string; userId: string; title: string; completedAt: string; status: string };
export type RewardsSnapshot = {
  id: string; window: { scheduledFor: string; start: string; end: string };
  tasks: RewardTask[]; payouts: { id: string; taskId: string; userId: string; credits: number; createdAt: string; weekStart: string }[];
  notifications: { id: string; taskId: string; state: string; attempts: number; lastError: string | null }[];
  totalCredits: number; pendingNotifications: number; balances: Record<string, number>;
  events: { id: number; event: string; taskId: string | null; createdAt: string }[];
  run?: { paidNow: number; failures: unknown[] }; recovery?: { failures: unknown[] };
};
export const REWARDS_KEY = 'mustbank.quest.example.v1';
export const CUSTOMER_ID = 'user-001';
class ApiError extends Error { constructor(message: string, public status: number) { super(message); } }
export async function rewardsApi(path: string, data?: unknown): Promise<RewardsSnapshot> {
  let response: Response;
  try { response = await fetch(path, data === undefined ? {} : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }); }
  catch { throw new Error('Unable to load rewards right now. Check your connection and try again.'); }
  let result;
  try { result = await response.json(); }
  catch { throw new Error('Rewards are temporarily unavailable. Try again in a moment.'); }
  if (!response.ok) throw new ApiError(result.error ?? 'Unable to complete the request. Please try again.', response.status);
  return result;
}
export function useRewards(customer = false) {
  const [searchParams] = useSearchParams();
  const workspace = searchParams.get('workspace');
  const [snapshot, setSnapshot] = useState<RewardsSnapshot | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const save = useCallback((value: RewardsSnapshot) => { setSnapshot(value); localStorage.setItem(REWARDS_KEY, value.id); }, []);
  const load = useCallback(async () => {
    const id = workspace ?? readStoredValue(REWARDS_KEY, '.quest.example.v1', value => /^[a-f0-9-]{36}$/.test(value));
    const read = (accountId: string) => rewardsApi(`/api/scenarios/${accountId}${customer ? '/customer' : ''}`);
    if (id) {
      try { return await read(id); }
      catch (failure) { if (workspace || !(failure instanceof ApiError) || failure.status !== 404) throw failure; }
    }
    const created = await rewardsApi('/api/scenarios', {});
    return customer ? await read(created.id) : created;
  }, [workspace, customer]);
  useEffect(() => {
    let active = true;
    setBusy(true); setError('');
    load().then(value => { if (active) save(value); }).catch(failure => { if (active) setError(failure.message); }).finally(() => { if (active) setBusy(false); });
    return () => { active = false; };
  }, [load, save]);
  async function action(work: () => Promise<RewardsSnapshot>, message: string | ((value: RewardsSnapshot) => string)) {
    setBusy(true); setError(''); setNotice('');
    try { const value = await work(); save(value); setNotice(typeof message === 'function' ? message(value) : message); }
    catch (failure) { setError((failure as Error).message); }
    finally { setBusy(false); }
  }
  const refresh = () => action(load, 'Rewards are up to date.');
  return { snapshot, busy, error, notice, action, refresh };
}
export const utcDate = (value: string) => new Date(value).toLocaleDateString('en-GB', { timeZone: 'UTC', day: 'numeric', month: 'short', year: 'numeric' });
export const utcTime = (value: string) => new Date(value).toLocaleString('en-GB', { timeZone: 'UTC', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) + ' UTC';
