/**
 * First-run setup: persist Postgres credentials to .env and create admin user.
 * Does not use requireSetup (this route is allowed when setup is required).
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');
const { resetPool } = require('../db');

const ENV_PATH = process.env.ENV_FILE_PATH || path.join(__dirname, '..', '..', '.env');
const AUTO_SETUP_EMAIL = 'admin@localhost';

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

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * When DATABASE_URL is set (e.g. Docker), create schema + admin on first run so no setup wizard is needed.
 * Generates a random admin password and logs it. Idempotent: does nothing if an admin already exists.
 * Retries connecting to the DB a few times so a fresh "docker compose up" can wait for Postgres.
 */
async function runAutoSetup() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) return;

  loadEnv();
  const maxAttempts = 10;
  const delayMs = 2000;
  let pool;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      pool = new Pool({ connectionString: dbUrl });
      await pool.query('SELECT 1');
      break;
    } catch (err) {
      if (pool) await pool.end().catch(() => {});
      pool = null;
      if (attempt === maxAttempts) {
        console.warn('Auto-setup: could not reach Postgres after %d attempts, skipping. Run setup wizard or restart.', maxAttempts);
        return;
      }
      console.log('Auto-setup: waiting for Postgres (attempt %d/%d)...', attempt, maxAttempts);
      await sleep(delayMs);
    }
  }

  try {
    await runSchema(pool);
    const r = await pool.query('SELECT 1 FROM users LIMIT 1');
    if (r.rowCount > 0) return; // already has admin

    const password = crypto.randomBytes(12).toString('base64').replace(/[/+=]/g, '').slice(0, 16);
    const passwordHash = await bcrypt.hash(password, 10);
    await pool.query(
      `INSERT INTO users (email, password_hash, is_admin) VALUES ($1, $2, true)`,
      [AUTO_SETUP_EMAIL, passwordHash]
    );

    const jwtSecret = process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex');
    writeEnv({ DATABASE_URL: dbUrl, JWT_SECRET: jwtSecret });
    resetPool();
    require('dotenv').config({ path: ENV_PATH });

    console.log('');
    console.log('--- FreeForAll first-run: admin created (no setup wizard) ---');
    console.log(`Login: ${AUTO_SETUP_EMAIL}`);
    console.log(`Password: ${password}`);
    console.log('Change the password after first login. ---');
    console.log('');
  } finally {
    if (pool) await pool.end();
  }
}

module.exports = function setupRouter() {
  const router = require('express').Router();

  /** GET /api/setup/status — whether setup is required (no DB or no admin), and if Docker DB is available */
  router.get('/status', async (req, res) => {
    loadEnv();
    const dockerDatabaseAvailable = !!process.env.DATABASE_URL;
    if (!process.env.DATABASE_URL) {
      return res.json({ setupRequired: true, reason: 'no_database', dockerDatabaseAvailable: false });
    }
    try {
      const { hasAdminUser } = require('../db');
      let hasAdmin = await hasAdminUser();
      // When Docker DB is set but no admin yet, run auto-setup now (e.g. startup ran before Postgres was ready)
      if (!hasAdmin && dockerDatabaseAvailable) {
        await runAutoSetup();
        resetPool();
        require('dotenv').config({ path: ENV_PATH });
        hasAdmin = await hasAdminUser();
      }
      return res.json({ setupRequired: !hasAdmin, reason: hasAdmin ? null : 'no_admin', dockerDatabaseAvailable });
    } catch {
      // Schema or DB not ready; with Docker, try auto-setup once then re-check
      if (dockerDatabaseAvailable) {
        await runAutoSetup();
        resetPool();
        require('dotenv').config({ path: ENV_PATH });
        try {
          const { hasAdminUser } = require('../db');
          const hasAdmin = await hasAdminUser();
          return res.json({ setupRequired: !hasAdmin, reason: hasAdmin ? null : 'no_admin', dockerDatabaseAvailable });
        } catch {
          // ignore
        }
      }
      return res.json({ setupRequired: true, reason: 'database_error', dockerDatabaseAvailable });
    }
  });

  /** POST /api/setup — body: email, password; optionally databaseUrl (or host/user/password/database) when not using Docker */
  router.post('/', async (req, res) => {
    try {
      loadEnv();
      const { databaseUrl, host, port, user, password, database, email, password: plainPassword } = req.body || {};
      // When DATABASE_URL is set (e.g. Docker), use it automatically — no database step
      let dbUrl = process.env.DATABASE_URL || databaseUrl || (host && user && password && database
        ? `postgres://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port || 5432}/${database}`
        : null);

      if (!dbUrl || !email || !plainPassword) {
        return res.status(400).json({ error: 'Missing database URL (or host/user/password/database) and/or email and password' });
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
        await pool.end().catch(() => {});
      }

      writeEnv(envToWrite);
      resetPool();
      require('dotenv').config({ path: ENV_PATH });

      return res.json({ success: true });
    } catch (err) {
      console.error('Setup POST error:', err);
      return res.status(500).json({ error: 'Setup failed', detail: err.message || String(err) });
    }
  });

  return router;
};

module.exports.runAutoSetup = runAutoSetup;
