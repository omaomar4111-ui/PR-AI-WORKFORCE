-- Migration 012: Drop PII columns from web_vitals (GDPR & Privacy Hardening)
-- Removes client_ip and full URL, replacing with privacy-safe route_template and country_code.

-- Drop legacy indexes on removed columns
DROP INDEX IF EXISTS idx_web_vitals_url;

-- Drop PII columns
ALTER TABLE web_vitals DROP COLUMN IF EXISTS client_ip;
ALTER TABLE web_vitals DROP COLUMN IF EXISTS url;

-- Add privacy-safe aggregated columns
ALTER TABLE web_vitals ADD COLUMN IF NOT EXISTS route_template VARCHAR(200) DEFAULT NULL;
ALTER TABLE web_vitals ADD COLUMN IF NOT EXISTS country_code CHAR(2) DEFAULT NULL;

-- Index for route-based aggregation
CREATE INDEX IF NOT EXISTS idx_web_vitals_route_template ON web_vitals(route_template);
CREATE INDEX IF NOT EXISTS idx_web_vitals_country_code ON web_vitals(country_code);

-- Truncate existing development data to eliminate any legacy PII
TRUNCATE TABLE web_vitals;
