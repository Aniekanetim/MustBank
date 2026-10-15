// Select a separately running build, never a behavior inside one workspace.
const args = process.argv.slice(2);
const value = (flag, fallback) => { const i = args.indexOf(flag); return i < 0 ? fallback : args[i + 1]; };
const selected = value('--build', 'fixed'), fixture = value('--fixture', 'single');
if (args.includes('--behavior')) throw new Error('Use --build faulty or --build fixed to select the separate application.');
if (selected && !['faulty', 'fixed'].includes(selected)) throw new Error('Choose --build faulty or fixed.');
const port = selected === 'faulty' ? 4175 : 4176;
const url = new URL(process.env.MUSTPAYROLL_URL ?? `http://127.0.0.1:${port}`);
if (!['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname) || url.protocol !== 'http:') throw new Error('Fixture preparation is restricted to the local MustPayroll service.');
async function post(path, data) {
  const response = await fetch(new URL(path, url), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
  const body = await response.json(); if (!response.ok) throw new Error(body.error); return body;
}
const health = await fetch(new URL('/api/health', url)).then(r => r.json());
if (selected && health.build.variant !== selected) throw new Error('The requested build is not running at this URL.');
const workspace = await post('/api/workspaces', { fixture });
if (args.includes('--fail-notification')) await post(`/api/workspaces/${workspace.id}/faults`, { kind: 'notification' });
console.log(`MustPayroll workspace: ${workspace.id}\nBuild: ${health.build.id}\nNotification failure armed: ${args.includes('--fail-notification')}\n\nPay run: ${new URL(`/pay-runs?workspace=${workspace.id}`, url)}\nOverview: ${new URL(`/overview?workspace=${workspace.id}`, url)}`);
