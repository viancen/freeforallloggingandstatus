const express = require('express');
const { getPool } = require('../db');

const router = express.Router();

router.get('/', async (req, res) => {
  const { app_id, level, from, to, limit = 100 } = req.query;
  try {
    let q = `
      SELECT l.id, l.app_id, a.name AS app_name, l.level, l.message, l.context, l.environment, l.hostname, l.created_at
      FROM logs l
      JOIN applications a ON a.id = l.app_id
      WHERE 1=1
    `;
    const params = [];
    let i = 1;
    if (app_id) {
      params.push(app_id);
      q += ` AND l.app_id = $${i++}`;
    }
    if (level) {
      params.push(level);
      q += ` AND l.level = $${i++}`;
    }
    if (from) {
      params.push(from);
      q += ` AND l.created_at >= $${i++}`;
    }
    if (to) {
      params.push(to);
      q += ` AND l.created_at <= $${i++}`;
    }
    params.push(Math.min(parseInt(limit, 10) || 100, 500));
    q += ` ORDER BY l.created_at DESC LIMIT $${i}`;
    const r = await getPool().query(q, params);
    res.json(r.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const r = await getPool().query(
      `SELECT l.id, l.app_id, a.name AS app_name, l.level, l.message, l.context, l.environment, l.hostname, l.created_at
       FROM logs l JOIN applications a ON a.id = l.app_id WHERE l.id = $1`,
      [req.params.id]
    );
    if (r.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(r.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
