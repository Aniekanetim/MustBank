// Local-only fixture preparation; no setup or failure switches appear in banking screens.
const args = process.argv.slice(2);
const value = (flag, fallback) => { const index = args.indexOf(flag); return index < 0 ? fallback : args[index + 1]; };
const behavior = value('--behavior', 'fixed');
const fixture = value('--fixture', 'single');
const url = new URL(process.env.MUSTBANK_URL ?? 'http://127.0.0.1:4174');
if (!['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname) || url.protocol !== 'http:') throw new Error('Fixture setup is restricted to the local MustBank service.');
if (!['fixed', 'faulty'].includes(behavior) || !['single', 'boundaries', 'empty'].includes(fixture)) throw new Error('Use --behavior fixed|faulty and --fixture single|boundaries|empty.');
async function post(path, data) {
  const response = await fetch(new URL(path, url), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
  const body = await response.json(); if (!response.ok) throw new Error(body.error); return body;
}
const account = await post('/api/scenarios', { mode: behavior, fixture });
if (args.includes('--fail-notification')) await post(`/api/scenarios/${account.id}/faults`, { kind: 'notification' });
console.log(`MustBank rewards account: ${account.id}\nBehavior: ${behavior}\nNotification failure armed: ${args.includes('--fail-notification')}\n\nOperations: ${new URL(`/operations/settlements?workspace=${account.id}`, url)}\nCustomer:   ${new URL(`/rewards?workspace=${account.id}`, url)}`);
