/**
 * POST /api/v1/ingest — Validate X-FreeForAll-Key, accept JSON log, return 202 and write async.
 */
const { getPool } = require('../db');

function ingestRouter() {
  const router = require('express').Router();

  router.post('/ingest', async (req, res) => {
    const apiKey = req.headers['x-freeforall-key'] || req.body?.api_key;
    if (!apiKey) {
      return res.status(401).json({ error: 'Missing X-FreeForAll-Key or api_key' });
    }

    let pool;
    try {
      pool = getPool();
    } catch {
      return res.status(503).json({ error: 'Service unavailable' });
    }

    const appResult = await pool.query('SELECT id FROM applications WHERE api_key = $1', [apiKey]);
    if (appResult.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid API Key' });
    }
    const appId = appResult.rows[0].id;

    const {
      level = 'info',
      message,
      context,
      environment = 'production',
      hostname,
    } = req.body || {};
    if (!message) {
      return res.status(400).json({ error: 'Missing message' });
    }

    // 202 Accepted — process write asynchronously
    res.status(202).send();

    pool.query(
      `INSERT INTO logs (app_id, level, message, context, environment, hostname)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        appId,
        level,
        message,
        context != null ? JSON.stringify(context) : null,
        environment,
        hostname || null,
      ]
    ).catch((err) => console.error('Ingestion write error:', err));
  });

  return router;
}

module.exports = ingestRouter;
