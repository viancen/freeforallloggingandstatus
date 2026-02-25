const express = require('express');
const { getPool } = require('../db');

const router = express.Router();

router.get('/', async (req, res) => {
  const { monitor_id, from, to, limit = 200 } = req.query;
  if (!monitor_id) return res.status(400).json({ error: 'monitor_id required' });
  try {
    let q = 'SELECT id, monitor_id, response_time_ms, status_code, is_up, error_message, created_at FROM ping_history WHERE monitor_id = $1';
    const params = [monitor_id];
    let i = 2;
    if (from) {
      params.push(from);
      q += ` AND created_at >= $${i++}`;
    }
    if (to) {
      params.push(to);
      q += ` AND created_at <= $${i++}`;
    }
    params.push(Math.min(parseInt(limit, 10) || 200, 1000));
    q += ` ORDER BY created_at DESC LIMIT $${i}`;
    const r = await getPool().query(q, params);
    res.json(r.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
