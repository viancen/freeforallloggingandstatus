const express = require('express');
const { getPool } = require('../db');

const router = express.Router();

router.get('/', async (req, res) => {
  const appId = req.query.app_id;
  try {
    let q = 'SELECT id, app_id, url, check_interval_seconds, is_active, last_status_code, last_checked_at, ssl_expiry, created_at FROM monitors';
    const params = [];
    if (appId) {
      params.push(appId);
      q += ' WHERE app_id = $1';
    }
    q += ' ORDER BY created_at DESC';
    const r = await getPool().query(q, params);
    res.json(r.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', async (req, res) => {
  const { app_id, url, check_interval_seconds = 60 } = req.body || {};
  if (!app_id || !url) return res.status(400).json({ error: 'app_id and url required' });
  try {
    const r = await getPool().query(
      `INSERT INTO monitors (app_id, url, check_interval_seconds) VALUES ($1, $2, $3)
       RETURNING id, app_id, url, check_interval_seconds, is_active, last_status_code, last_checked_at, ssl_expiry, created_at`,
      [app_id, url, check_interval_seconds]
    );
    res.status(201).json(r.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/:id', async (req, res) => {
  const { url, is_active, check_interval_seconds } = req.body || {};
  try {
    const r = await getPool().query(
      `UPDATE monitors SET url = COALESCE($2, url), is_active = COALESCE($3, is_active), check_interval_seconds = COALESCE($4, check_interval_seconds)
       WHERE id = $1 RETURNING id, app_id, url, check_interval_seconds, is_active, last_status_code, last_checked_at, ssl_expiry, created_at`,
      [req.params.id, url, is_active, check_interval_seconds]
    );
    if (r.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(r.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const r = await getPool().query('DELETE FROM monitors WHERE id = $1 RETURNING id', [req.params.id]);
    if (r.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
