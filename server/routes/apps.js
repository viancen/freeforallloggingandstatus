const express = require('express');
const crypto = require('crypto');
const { getPool } = require('../db');

const router = express.Router();

function generateApiKey() {
  return 'ffa_' + crypto.randomBytes(24).toString('hex');
}

router.get('/', async (req, res) => {
  try {
    const r = await getPool().query(
      'SELECT id, name, api_key, webhook_url, created_at FROM applications ORDER BY created_at DESC'
    );
    res.json(r.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', async (req, res) => {
  const { name } = req.body || {};
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'name is required' });
  }
  const api_key = generateApiKey();
  try {
    const r = await getPool().query(
      'INSERT INTO applications (name, api_key) VALUES ($1, $2) RETURNING id, name, api_key, webhook_url, created_at',
      [name.trim(), api_key]
    );
    res.status(201).json(r.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.patch('/:id', async (req, res) => {
  const { name, webhook_url } = req.body || {};
  try {
    const r = await getPool().query(
      `UPDATE applications SET name = COALESCE($2, name), webhook_url = COALESCE($3, webhook_url)
       WHERE id = $1 RETURNING id, name, api_key, webhook_url, created_at`,
      [req.params.id, name, webhook_url]
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
    const r = await getPool().query('DELETE FROM applications WHERE id = $1 RETURNING id', [req.params.id]);
    if (r.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
