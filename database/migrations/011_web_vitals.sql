-- Migration 011: Web Vitals Telemetry Storage (Real User Monitoring)
-- Table to persist Core Web Vitals (LCP, FID/INP, CLS, FCP, TTFB) reported from client browsers.

CREATE TABLE IF NOT EXISTS web_vitals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    metric_name VARCHAR(32) NOT NULL,
    metric_value DOUBLE PRECISION NOT NULL,
    rating VARCHAR(32) DEFAULT 'good',
    delta DOUBLE PRECISION DEFAULT 0.0,
    metric_id VARCHAR(128),
    navigation_type VARCHAR(64),
    url TEXT,
    client_ip VARCHAR(64),
    trace_id VARCHAR(64),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance aggregation and time-range filtering
CREATE INDEX IF NOT EXISTS idx_web_vitals_name_created ON web_vitals(metric_name, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_web_vitals_url ON web_vitals(url);
CREATE INDEX IF NOT EXISTS idx_web_vitals_rating ON web_vitals(rating);

-- Enable Row Level Security (RLS)
ALTER TABLE web_vitals ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view vitals, and service role to insert
CREATE POLICY "Allow service role insert web_vitals"
    ON web_vitals FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Allow authenticated read web_vitals"
    ON web_vitals FOR SELECT
    USING (true);
