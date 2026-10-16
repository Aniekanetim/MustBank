import { createServer } from 'node:http';
import { existsSync, mkdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { InputError, PayrollService, BUILD_VARIANT } from './payroll.mjs';
import { BUILD_INFO } from './build-info.mjs';

if (BUILD_INFO.variant !== BUILD_VARIANT) throw new Error('Build metadata and payment implementation disagree.');

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const database = resolve(process.env.PAYROLL_DB ?? resolve(root, 'data', 'payroll.sqlite'));
mkdirSync(dirname(database), { recursive: true });
const service = new PayrollService(database);
const dist = resolve(root, 'dist');

async function body(request) {
  let text = '';
  for await (const chunk of request) {
    text += chunk;
    if (Buffer.byteLength(text) > 65536) throw new InputError('Request is too large.', 413);
  }
  try { const value = JSON.parse(text || '{}'); if (!value || Array.isArray(value) || typeof value !== 'object') throw new Error(); return value; }
  catch { throw new InputError('Supply a JSON object.'); }
}
function json(response, value, status = 200) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  response.end(JSON.stringify(value));
}
const server = createServer(async (request, response) => {
  try {
    const path = new URL(request.url, 'http://localhost').pathname;
    if (path === '/api/health' && request.method === 'GET') return json(response, { status: 'ok', storage: 'sqlite', application: 'MustPayroll', schemaVersion: 2, build: BUILD_INFO });
    if (path === '/api/workspaces' && request.method === 'POST') return json(response, service.create(await body(request)), 201);
    const match = path.match(/^\/api\/workspaces\/([a-zA-Z0-9_-]+)(?:\/(earnings|run|faults|retry-notifications)(?:\/([a-zA-Z0-9_-]+)\/approve)?)?$/);
    if (match) {
      const [, id, action, earningId] = match;
      if (!action && request.method === 'GET') return json(response, service.snapshot(id, new URL(request.url, 'http://localhost').searchParams.get('scheduledFor') ?? undefined));
      if (request.method === 'POST') {
        const input = await body(request);
        if (action === 'earnings' && earningId) return json(response, service.approve(id, earningId));
        if (action === 'earnings') return json(response, service.addEarnings(id, input.earnings));
        if (action === 'run') return json(response, service.execute(id, input.scheduledFor));
        if (action === 'faults') return json(response, service.setFault(id, input.kind));
        if (action === 'retry-notifications') return json(response, service.retryNotifications(id));
      }
    }
    if (path.startsWith('/api/')) throw new InputError('Endpoint not found.', 404);
    if (request.method !== 'GET' && request.method !== 'HEAD') throw new InputError('Method not supported.', 405);
    const candidate = resolve(dist, '.' + decodeURIComponent(path));
    if (candidate !== dist && !candidate.startsWith(dist + sep)) throw new InputError('Path not permitted.', 403);
    const file = existsSync(candidate) && statSync(candidate).isFile() ? candidate : resolve(dist, 'index.html');
    if (!existsSync(file)) throw new InputError('Build the frontend with npm run build, or use npm run dev.', 404);
    const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json' }[extname(file)] ?? 'application/octet-stream';
    response.writeHead(200, { 'Content-Type': mime, 'X-Content-Type-Options': 'nosniff' });
    response.end(request.method === 'HEAD' ? undefined : readFileSync(file));
  } catch (error) {
    if (!(error instanceof InputError)) console.error(error);
    json(response, { error: error instanceof InputError ? error.message : 'Unable to complete the request.' }, error instanceof InputError ? error.status : 500);
  }
});
server.on('close', () => service.close());
server.listen(Number(process.env.PORT ?? BUILD_INFO.defaultPort), process.env.HOST ?? '127.0.0.1', () => console.log(`MustPayroll ${BUILD_INFO.id} listening on ${process.env.PORT ?? BUILD_INFO.defaultPort}`));
process.on('SIGINT', () => server.close());
process.on('SIGTERM', () => server.close());
