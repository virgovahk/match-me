-- Creates the connections table used for friend/connection requests and mutual connections.
-- This migration is safe to re-run because it uses IF NOT EXISTS.

CREATE TABLE IF NOT EXISTS connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'requested',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Prevent duplicate connections in either direction.
CREATE UNIQUE INDEX IF NOT EXISTS connections_unique_pair
  ON connections (LEAST(sender_id, receiver_id), GREATEST(sender_id, receiver_id));

-- Automatically update updated_at on change.
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_updated_at ON connections;

CREATE TRIGGER trigger_update_updated_at
BEFORE UPDATE ON connections
FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();