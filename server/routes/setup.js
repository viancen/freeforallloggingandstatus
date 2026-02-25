/**
 * First-run setup: persist Postgres credentials to .env and create admin user.
 * Does not use requireSetup (this route is allowed when setup is required).
 */
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');
const { resetPool } = require('../db');

const ENV_PATH = path.join(__dirname, '..', '..', '.env');

function loadEnv() {
  if (fs.existsSync(ENV_PATH)) {
    require('dotenv').config({ path: ENV_PATH });
  }
}

async function runSchema(pool) {
  const initPath = path.join(__dirname, '..', '..', 'init.sql');
  if (!fs.existsSync(initPath)) return;
  const sql = fs.readFileSync(initPath, 'utf8');
  await pool.query(sql);
}

function writeEnv(env) {
  const lines = Object.entries(env)
    .filter(([, v]) => v != null && v !== '')
    .map(([k, v]) => `${k}=${String(v).replace(/\n/g, ' ')}`);
  fs.writeFileSync(ENV_PATH, lines.join('\n') + '\n', 'utf8');
}

module.exports = function setupRouter() {
  const router = require('express').Router();

  /** GET /api/setup/status — whether setup is required (no DB or no admin) */
  router.get('/status', async (req, res) => {
    loadEnv();
    if (!process.env.DATABASE_URL) {
      return res.json({ setupRequired: true, reason: 'no_database' });
    }
    try {
      const { hasAdminUser } = require('../db');
      const hasAdmin = await hasAdminUser();
      return res.json({ setupRequired: !hasAdmin, reason: hasAdmin ? null : 'no_admin' });
    } catch {
      return res.json({ setupRequired: true, reason: 'database_error' });
    }
  });

  /** POST /api/setup — body: { databaseUrl } or { host, port, user, password, database }, email, password */
  router.post('/', async (req, res) => {
    loadEnv();
    const { databaseUrl, host, port, user, password, database, email, password: plainPassword } = req.body || {};
    const dbUrl = databaseUrl || (host && user && password && database
      ? `postgres://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port || 5432}/${database}`
      : null);

    if (!dbUrl || !email || !plainPassword) {
      return res.status(400).json({ error: 'Missing databaseUrl (or host/user/password/database), email, or password' });
    }

    const jwtSecret = process.env.JWT_SECRET || require('crypto').randomBytes(32).toString('hex');
    const envToWrite = {
      DATABASE_URL: dbUrl,
      JWT_SECRET: jwtSecret,
    };

    let pool;
    try {
      pool = new Pool({ connectionString: dbUrl });
      await pool.query('SELECT 1');
    } catch (err) {
      return res.status(400).json({ error: 'Database connection failed', detail: err.message });
    }

    try {
      await runSchema(pool);
      const passwordHash = await bcrypt.hash(plainPassword, 10);
      await pool.query(
        `INSERT INTO users (email, password_hash, is_admin) VALUES ($1, $2, true)
         ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, is_admin = true`,
        [email, passwordHash]
      );
    } catch (err) {
      return res.status(500).json({ error: 'Setup failed', detail: err.message });
    } finally {
      await pool.end();
    }

    writeEnv(envToWrite);
    resetPool();
    require('dotenv').config({ path: ENV_PATH });

    return res.json({ success: true });
  });

  return router;
};
