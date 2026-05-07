CREATE TABLE IF NOT EXISTS dismissed_recommendations (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  dismissed_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at        TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, dismissed_user_id)
);
