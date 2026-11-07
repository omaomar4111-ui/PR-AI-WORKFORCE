-- Migration 013: Harden web_vitals RLS policies to service_role only
-- Prevents data leakage: authenticated users and anonymous clients cannot read or query telemetry data.
-- Access is restricted exclusively to service_role (backend operations).

DROP POLICY IF EXISTS "Allow authenticated read web_vitals" ON web_vitals;
DROP POLICY IF EXISTS "Allow service role insert web_vitals" ON web_vitals;
DROP POLICY IF EXISTS "Service role full access" ON web_vitals;

CREATE POLICY "Service role full access"
    ON web_vitals
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);
