// Local fixture preparation. Failure switches never appear in payroll screens.
const args = process.argv.slice(2);
const value = (flag, fallback) => { const i = args.indexOf(flag); return i < 0 ? fallback : args[i + 1]; };
const behavior = value('--behavior', 'fixed'), fixture = value('--fixture', 'single');
const url = new URL(process.env.MUSTPAYROLL_URL ?? 'http://127.0.0.1:4174');
if (!['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname) || url.protocol !== 'http:') throw new Error('Fixture preparation is restricted to the local MustPayroll service.');
async function post(path, data) {
  const response = await fetch(new URL(path, url), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
  const body = await response.json(); if (!response.ok) throw new Error(body.error); return body;
}
const workspace = await post('/api/workspaces', { behavior, fixture });
if (args.includes('--fail-notification')) await post(`/api/workspaces/${workspace.id}/faults`, { kind: 'notification' });
console.log(`MustPayroll workspace: ${workspace.id}\nBehavior: ${behavior}\nNotification failure armed: ${args.includes('--fail-notification')}\n\nPay run: ${new URL(`/pay-runs?workspace=${workspace.id}`, url)}\nOverview: ${new URL(`/overview?workspace=${workspace.id}`, url)}`);
