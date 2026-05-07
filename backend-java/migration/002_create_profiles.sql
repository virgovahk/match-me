CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  birthdate DATE NOT NULL,
  gender TEXT NOT NULL,
  bio TEXT NOT NULL,
  profile_picture TEXT,
  city TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  interests JSONB DEFAULT '[]',
  hobbies JSONB DEFAULT '[]',
  music_preferences JSONB DEFAULT '[]',
  food_preferences JSONB DEFAULT '[]',
  personality_traits JSONB DEFAULT '[]',
  looking_for TEXT,
  max_distance_km INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Safely add columns for incremental migrations on existing databases
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS interests TEXT DEFAULT '[]';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS hobbies TEXT DEFAULT '[]';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS music_preferences TEXT DEFAULT '[]';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS food_preferences TEXT DEFAULT '[]';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS personality_traits TEXT DEFAULT '[]';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS looking_for TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS max_distance_km INTEGER;
