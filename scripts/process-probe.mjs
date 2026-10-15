import { PayrollService } from '../server/payroll.mjs';
const [path, id] = process.argv.slice(2);
const service = new PayrollService(path);
try { console.log(JSON.stringify(service.execute(id))); } finally { service.close(); }
