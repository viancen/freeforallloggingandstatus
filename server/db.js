/**
 * PostgreSQL pool. Lazy-initialized from DATABASE_URL (set after setup).
 */
const { Pool } = require('pg');

let pool = null;
let poolError = null;

function getPool() {
  if (pool) return pool;
  if (poolError) throw poolError;
  const url = process.env.DATABASE_URL;
  if (!url) {
    poolError = new Error('DATABASE_URL not set');
    throw poolError;
  }
  pool = new Pool({ connectionString: url, max: 20 });
  return pool;
}

async function testConnection() {
  const p = getPool();
  const client = await p.connect();
  try {
    await client.query('SELECT 1');
    return true;
  } finally {
    client.release();
  }
}

async function hasAdminUser() {
  try {
    const p = getPool();
    const r = await p.query('SELECT 1 FROM users LIMIT 1');
    return r.rowCount > 0;
  } catch {
    return false;
  }
}

function resetPool() {
  if (pool) {
    pool.end().catch(() => {});
    pool = null;
  }
  poolError = null;
}

module.exports = { getPool, testConnection, hasAdminUser, resetPool };
