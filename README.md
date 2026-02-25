# FreeForAll — Logging & Status

Self-hosted, account-free replacement for **Laravel Flare**, **Papertrail**, and **Oh Dear**. One-command deploy with Docker.

- **Logging:** High-performance ingestion API with JSONB context (stack traces, request data).
- **Uptime:** Background worker pings URLs every 60s and checks SSL expiry daily.
- **Dashboard:** Vue 3 + Tailwind; service health, log explorer, stack-trace viewer.

**Stack:** Node.js (Express), Vue 3, PostgreSQL, Docker.

---

## Quick start

```bash
git clone https://github.com/your-org/freeforallloggingandstatus.git
cd freeforallloggingandstatus
docker compose up -d
```

Open `http://localhost:3000`. On first run you’ll see the **Setup Wizard**: enter your Postgres URL (or use the same as in `docker-compose.yml`) and create the first admin account. Then log in and add an Application to get an API key.

---

## Environment (Docker)

| Variable | Description |
|----------|-------------|
| `POSTGRES_USER` | Postgres user (default: `freeforall`) |
| `POSTGRES_PASSWORD` | Postgres password |
| `POSTGRES_DB` | Database name (default: `freeforall`) |
| `PORT` | App port (default: `3000`) |
| `JWT_SECRET` | Secret for dashboard JWT (set in production) |

---

## Ingestion API

- **Endpoint:** `POST /api/v1/ingest`
- **Auth:** Header `X-FreeForAll-Key: <your-app-api-key>`
- **Response:** `202 Accepted` (fire-and-forget)

**Body (JSON):**

```json
{
  "level": "error",
  "message": "Something went wrong",
  "context": {
    "exception": "RuntimeException",
    "trace": "#0 /app/foo.php(10): bar()\n#1 ..."
  },
  "environment": "production",
  "hostname": "web-1"
}
```

---

## Framework SDK integration

### 1. Laravel (custom log channel)

Install the PHP SDK (local path or packagist):

```bash
composer require viancen/freeforall
```

In `config/logging.php` add a channel and use it in your stack:

```php
'channels' => [
    'stack' => [
        'driver' => 'stack',
        'channels' => ['single', 'freeforall'],
        'ignore_exceptions' => false,
    ],
    'freeforall' => [
        'driver' => 'monolog',
        'handler' => \Viancen\FreeForAll\FreeForAllHandler::class,
        'with' => [
            env('FREEFORALL_URL', 'https://log.yourdomain.com'),
            env('FREEFORALL_API_KEY'),
            \Monolog\Level::Debug,
            true,
            1,
        ],
    ],
],
```

In `.env`:

```
FREEFORALL_URL=https://log.yourdomain.com
FREEFORALL_API_KEY=ffa_xxxxxxxx
```

---

### 2. Django (HTTP handler)

Send logs to FreeForAll with a custom handler:

```python
# myapp/logging_handlers.py
import logging
import json
import urllib.request

class FreeForAllHandler(logging.Handler):
    def __init__(self, ingest_url, api_key):
        super().__init__()
        self.ingest_url = ingest_url.rstrip("/") + "/api/v1/ingest"
        self.api_key = api_key

    def emit(self, record):
        try:
            body = json.dumps({
                "level": record.levelname.lower(),
                "message": self.format(record),
                "context": getattr(record, "context", {}),
                "environment": getattr(record, "environment", "production"),
                "hostname": getattr(record, "hostname", None),
            }).encode("utf-8")
            req = urllib.request.Request(
                self.ingest_url,
                data=body,
                headers={
                    "Content-Type": "application/json",
                    "X-FreeForAll-Key": self.api_key,
                },
                method="POST",
            )
            urllib.request.urlopen(req, timeout=1)
        except Exception:
            self.handleError(record)
```

In `settings.py`:

```python
LOGGING = {
    "version": 1,
    "handlers": {
        "freeforall": {
            "()": "myapp.logging_handlers.FreeForAllHandler",
            "ingest_url": "https://log.yourdomain.com",
            "api_key": os.environ.get("FREEFORALL_API_KEY", ""),
        },
    },
    "root": {
        "handlers": ["console", "freeforall"],
        "level": "INFO",
    },
}
```

---

### 3. Node (Winston transport)

```bash
npm install winston axios
```

```javascript
const winston = require('winston');
const axios = require('axios');

const FreeForAllTransport = (opts) => ({
  log(info, callback) {
    const level = (info.level || 'info').toLowerCase();
    axios
      .post(
        `${opts.ingestUrl.replace(/\/$/, '')}/api/v1/ingest`,
        {
          level,
          message: info.message,
          context: info,
          environment: opts.environment || 'production',
          hostname: opts.hostname,
        },
        {
          headers: { 'X-FreeForAll-Key': opts.apiKey },
          timeout: 1000,
        }
      )
      .then(() => callback())
      .catch(() => callback());
  },
});

const logger = winston.createLogger({
  transports: [
    new winston.transports.Console(),
    FreeForAllTransport({
      ingestUrl: process.env.FREEFORALL_URL,
      apiKey: process.env.FREEFORALL_API_KEY,
      environment: process.env.NODE_ENV,
    }),
  ],
});
```

---

### 4. Vue 3 / React (global error listener)

**Vue 3** (in `main.js` or app entry):

```javascript
import { createApp } from 'vue';
import App from './App.vue';

const app = createApp(App);
app.config.errorHandler = (err, instance, info) => {
  console.error(err, info);
  fetch(`${import.meta.env.VITE_FREEFORALL_URL}/api/v1/ingest`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-FreeForAll-Key': import.meta.env.VITE_FREEFORALL_API_KEY,
    },
    body: JSON.stringify({
      level: 'error',
      message: err?.message || String(err),
      context: { info, stack: err?.stack, component: instance?.$options?.name },
      environment: import.meta.env.MODE,
    }),
  }).catch(() => {});
};
app.mount('#app');
```

**React** (global error boundary + `window.onerror`):

```javascript
// Report to FreeForAll
function report(error, context = {}) {
  fetch(`${process.env.REACT_APP_FREEFORALL_URL}/api/v1/ingest`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-FreeForAll-Key': process.env.REACT_APP_FREEFORALL_API_KEY,
    },
    body: JSON.stringify({
      level: 'error',
      message: error?.message ?? String(error),
      context: { ...context, stack: error?.stack },
      environment: process.env.NODE_ENV,
    }),
  }).catch(() => {});
}
window.onerror = (msg, source, lineno, colno, err) => {
  report(err || new Error(msg), { source, lineno, colno });
};
```

---

### 5. Symfony (Monolog config)

In `config/packages/monolog.yaml`:

```yaml
monolog:
  channels: ['freeforall']
  handlers:
    freeforall:
      type: service
      id: Viancen\FreeForAll\FreeForAllHandler
      level: debug
      channels: ['app']
```

Register the handler as a service (e.g. `config/services.yaml`):

```yaml
services:
  Viancen\FreeForAll\FreeForAllHandler:
    arguments:
      $ingestUrl: '%env(FREEFORALL_URL)%'
      $apiKey: '%env(FREEFORALL_API_KEY)%'
      $timeout: 1
```

---

### 6. Angular (error handler)

```typescript
// app.config.ts or main provider
import { ErrorHandler, Injectable } from '@angular/core';

@Injectable()
export class FreeForAllErrorHandler implements ErrorHandler {
  handleError(error: unknown): void {
    console.error(error);
    const url = (window as any).FREEFORALL_URL;
    const key = (window as any).FREEFORALL_API_KEY;
    if (!url || !key) return;
    fetch(`${url}/api/v1/ingest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-FreeForAll-Key': key },
      body: JSON.stringify({
        level: 'error',
        message: error instanceof Error ? error.message : String(error),
        context: { stack: error instanceof Error ? error.stack : null },
        environment: (window as any).ENV ?? 'production',
      }),
    }).catch(() => {});
  }
}

// In providers:
// { provide: ErrorHandler, useClass: FreeForAllErrorHandler }
```

---

### 7. Plain PHP (manual Monolog push)

```bash
composer require viancen/freeforall
```

```php
<?php
use Monolog\Logger;
use Viancen\FreeForAll\FreeForAllHandler;

$log = new Logger('app');
$log->pushHandler(new FreeForAllHandler(
    ingestUrl: 'https://log.yourdomain.com',
    apiKey: getenv('FREEFORALL_API_KEY'),
    level: Logger::DEBUG,
    timeout: 1
));
$log->error('Something broke', ['user_id' => 123, 'trace' => $e->getTraceAsString()]);
```

---

## Repository layout

| Path | Description |
|------|-------------|
| `init.sql` | Postgres schema (applications, logs, monitors, ping_history, users) |
| `server/` | Node.js API, ingest route, setup, auth, worker (node-cron) |
| `client/` | Vue 3 dashboard (Tailwind, Chart.js) |
| `sdk/php/` | Composer package `Viancen\FreeForAll\FreeForAllHandler` |
| `docker-compose.yml` | Postgres + app; volumes for data and `.env` |

---

## License

Free to use, modify, and distribute. **No warranty; no liability.** Use at your own risk. See [LICENSE](LICENSE).
