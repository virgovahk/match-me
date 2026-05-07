-- Add match_preferences so users can choose which profile fields should be used for recommendations.
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS match_preferences JSONB DEFAULT '["location","age","hobbies","music","connections"]';