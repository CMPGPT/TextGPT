-- Create logs table for better error tracking and diagnostics
CREATE TABLE IF NOT EXISTS logs (
  id SERIAL PRIMARY KEY,
  level TEXT NOT NULL,
  message TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add index on level for filtering
CREATE INDEX IF NOT EXISTS logs_level_idx ON logs (level);

-- Add index on created_at for time-based queries
CREATE INDEX IF NOT EXISTS logs_created_at_idx ON logs (created_at);

-- Add GIN index on metadata for JSON querying
CREATE INDEX IF NOT EXISTS logs_metadata_idx ON logs USING GIN (metadata);

-- Create a function to auto-cleanup old logs (older than 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_logs() RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM logs WHERE created_at < NOW() - INTERVAL '30 days';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to run the cleanup function
DROP TRIGGER IF EXISTS trigger_cleanup_logs ON logs;
CREATE TRIGGER trigger_cleanup_logs
AFTER INSERT ON logs
EXECUTE PROCEDURE cleanup_old_logs();

-- Comment on table
COMMENT ON TABLE logs IS 'Stores application logs for debugging and monitoring'; 