-- Migration 014: 30-Day Retention Policy for Web Vitals Telemetry
-- Purges raw vitals older than 30 days to enforce storage hygiene and privacy retention schedules.

CREATE OR REPLACE FUNCTION purge_old_web_vitals()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    deleted_count integer;
BEGIN
    DELETE FROM web_vitals
    WHERE created_at < NOW() - INTERVAL '30 days';
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$;

-- Grant execution to service_role only
REVOKE ALL ON FUNCTION purge_old_web_vitals() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION purge_old_web_vitals() TO service_role;
