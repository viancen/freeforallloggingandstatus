require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const setupRouter = require('./routes/setup');
const ingestRouter = require('./routes/ingest');
const authRouter = require('./routes/auth');
const appsRouter = require('./routes/apps');
const monitorsRouter = require('./routes/monitors');
const logsRouter = require('./routes/logs');
const pingHistoryRouter = require('./routes/pingHistory');
const { requireSetup } = require('./middleware/requireSetup');
const authMiddleware = require('./middleware/auth');
const { startWorker } = require('./worker');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Setup (no auth, no requireSetup)
app.use('/api/setup', setupRouter());

// Ingest API — no dashboard auth; only API key validation inside route
app.use('/api/v1', ingestRouter());

// Dashboard API — require DB + admin, then JWT for protected routes
app.get('/api/ready', async (req, res) => {
  try {
    const { hasAdminUser } = require('./db');
    if (!process.env.DATABASE_URL) return res.status(503).json({ setupRequired: true });
    const hasAdmin = await hasAdminUser();
    res.json({ setupRequired: !hasAdmin });
  } catch {
    res.status(503).json({ setupRequired: true });
  }
});

app.use('/api/auth', requireSetup, authRouter);
app.use('/api/apps', requireSetup, authMiddleware, appsRouter);
app.use('/api/monitors', requireSetup, authMiddleware, monitorsRouter);
app.use('/api/logs', requireSetup, authMiddleware, logsRouter);
app.use('/api/ping-history', requireSetup, authMiddleware, pingHistoryRouter);

// Serve built Vue app (fallback to index.html for SPA)
const clientDir = path.join(__dirname, '..', 'client', 'dist');
app.use(express.static(clientDir));
app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) return res.status(404).json({ error: 'Not found' });
  res.sendFile(path.join(clientDir, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
  startWorker();
});
