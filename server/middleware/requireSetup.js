/**
 * If no DATABASE_URL or no admin user exists, treat as "setup required".
 * API returns 503 + { setupRequired: true }; frontend redirects to /setup.
 */
const { hasAdminUser } = require('../db');

async function requireSetup(req, res, next) {
  if (!process.env.DATABASE_URL) {
    return res.status(503).json({ setupRequired: true, reason: 'no_database' });
  }
  try {
    const hasAdmin = await hasAdminUser();
    if (!hasAdmin) {
      return res.status(503).json({ setupRequired: true, reason: 'no_admin' });
    }
    next();
  } catch (err) {
    return res.status(503).json({ setupRequired: true, reason: 'database_error' });
  }
}

module.exports = { requireSetup };
