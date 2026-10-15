import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
const { PayrollService } = await import(pathToFileURL(join(resolve(process.env.PAYROLL_TEST_BUILD_DIR ?? '../MustBank/MustPayroll_fixed'), 'server/payroll.mjs')).href);
const [path, id] = process.argv.slice(2);
const service = new PayrollService(path);
try { console.log(JSON.stringify(service.execute(id))); } finally { service.close(); }
