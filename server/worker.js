/**
 * Uptime pings every 60s; SSL expiry check once per day.
 */
const cron = require('node-cron');
const axios = require('axios');
const https = require('https');
const { getPool } = require('./db');

const PING_TIMEOUT = 10000;

async function pingMonitors() {
  let pool;
  try {
    pool = getPool();
  } catch {
    return;
  }
  let monitors;
  try {
    const r = await pool.query('SELECT id, url FROM monitors WHERE is_active = true');
    monitors = r.rows;
  } catch (err) {
    console.error('Worker: fetch monitors error', err.message);
    return;
  }
  for (const m of monitors) {
    const start = Date.now();
    try {
      const res = await axios.get(m.url, { timeout: PING_TIMEOUT, validateStatus: () => true });
      const ms = Date.now() - start;
      await pool.query(
        `INSERT INTO ping_history (monitor_id, response_time_ms, status_code, is_up) VALUES ($1, $2, $3, true)`,
        [m.id, ms, res.status]
      );
      await pool.query(
        'UPDATE monitors SET last_status_code = $2, last_checked_at = NOW() WHERE id = $1',
        [m.id, res.status]
      );
    } catch (err) {
      await pool.query(
        `INSERT INTO ping_history (monitor_id, is_up, error_message) VALUES ($1, false, $2)`,
        [m.id, err.message || 'Request failed']
      );
      await pool.query(
        'UPDATE monitors SET last_checked_at = NOW() WHERE id = $1',
        [m.id]
      );
    }
  }
}

async function checkSslExpiry() {
  let pool;
  try {
    pool = getPool();
  } catch {
    return;
  }
  let monitors;
  try {
    const r = await pool.query('SELECT id, url FROM monitors WHERE is_active = true');
    monitors = r.rows;
  } catch {
    return;
  }
  for (const m of monitors) {
    let expiry = null;
    try {
      const u = new URL(m.url);
      if (u.protocol !== 'https:') continue;
      const socket = await new Promise((resolve, reject) => {
        const req = https.request(
          { hostname: u.hostname, port: 443, method: 'HEAD' },
          (res) => {
            resolve(res.socket);
          }
        );
        req.on('error', reject);
        req.setTimeout(5000, () => {
          req.destroy();
          reject(new Error('timeout'));
        });
        req.end();
      });
      const cert = socket.getPeerCertificate && socket.getPeerCertificate();
      if (cert && cert.valid_to) {
        expiry = new Date(cert.valid_to);
      }
    } catch {
      // ignore per-URL errors
    }
    if (expiry) {
      await pool.query('UPDATE monitors SET ssl_expiry = $2 WHERE id = $1', [m.id, expiry]);
    }
  }
}

let workerStarted = false;

function startWorker() {
  if (workerStarted) return;
  workerStarted = true;
  cron.schedule('* * * * *', () => pingMonitors());
  cron.schedule('0 3 * * *', () => checkSslExpiry());
  console.log('Worker: uptime cron (every minute) and SSL cron (daily 03:00) scheduled');
}

module.exports = { startWorker, pingMonitors, checkSslExpiry };
