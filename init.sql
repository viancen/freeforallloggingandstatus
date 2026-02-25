-- freeforallloggingandstatus — PostgreSQL Schema
-- Run once on first deployment (e.g. via Docker init or manual)

-- 1. Applications (api_key, app_name — source of truth for ingestion)
CREATE TABLE IF NOT EXISTS applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    api_key VARCHAR(64) UNIQUE NOT NULL,
    webhook_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Logs (Flare/Papertrail replacement — context is JSONB for stack traces)
CREATE TABLE IF NOT EXISTS logs (
    id BIGSERIAL PRIMARY KEY,
    app_id UUID REFERENCES applications(id) ON DELETE CASCADE,
    level VARCHAR(20) DEFAULT 'info',
    message TEXT NOT NULL,
    context JSONB,
    environment VARCHAR(50) DEFAULT 'production',
    hostname VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_logs_app_id ON logs(app_id);
CREATE INDEX IF NOT EXISTS idx_logs_level ON logs(level);
CREATE INDEX IF NOT EXISTS idx_logs_created_at ON logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_logs_context_gin ON logs USING GIN (context);

-- 3. Uptime Monitors (Oh Dear replacement)
CREATE TABLE IF NOT EXISTS monitors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    app_id UUID REFERENCES applications(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    check_interval_seconds INTEGER DEFAULT 60,
    is_active BOOLEAN DEFAULT TRUE,
    last_status_code INTEGER,
    last_checked_at TIMESTAMP WITH TIME ZONE,
    ssl_expiry TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Ping History (time-series for latency graphs)
CREATE TABLE IF NOT EXISTS ping_history (
    id BIGSERIAL PRIMARY KEY,
    monitor_id UUID REFERENCES monitors(id) ON DELETE CASCADE,
    response_time_ms INTEGER,
    status_code INTEGER,
    is_up BOOLEAN,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ping_history_monitor_created ON ping_history(monitor_id, created_at DESC);

-- 5. Users (dashboard admin — created by setup wizard)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    is_admin BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
