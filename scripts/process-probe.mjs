import { RewardsService } from '../server/rewards.mjs';
const [path, id] = process.argv.slice(2);
const service = new RewardsService(path);
try { console.log(JSON.stringify(service.settle(id))); }
finally { service.close(); }
