const path = require('node:path');
require('dotenv').config({ path: path.resolve(process.cwd(), '.env') });
require('./tcpPolicy').allowedPorts(); // Fail startup for a malformed operator allowlist.
module.exports = {
  port: Number(process.env.PORT || 3001), host: process.env.HOST || '127.0.0.1',
  corsOrigin: process.env.CORS_ORIGIN || 'http://127.0.0.1:5173',
  dbPath: process.env.DB_PATH || path.resolve(process.cwd(), 'server/data/pulsewatch.db'),
  concurrency: Number(process.env.MONITOR_CONCURRENCY || 5), retentionDays: Number(process.env.CHECK_RETENTION_DAYS || 30)
};
