-- Convert profile array columns from TEXT to JSONB safely

DO $$
BEGIN
  IF (
    SELECT data_type
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = 'interests'
  ) = 'text' THEN

    ALTER TABLE profiles ALTER COLUMN interests DROP DEFAULT;
    ALTER TABLE profiles ALTER COLUMN interests TYPE JSONB USING interests::JSONB;
    ALTER TABLE profiles ALTER COLUMN interests SET DEFAULT '[]'::jsonb;

    ALTER TABLE profiles ALTER COLUMN hobbies DROP DEFAULT;
    ALTER TABLE profiles ALTER COLUMN hobbies TYPE JSONB USING hobbies::JSONB;
    ALTER TABLE profiles ALTER COLUMN hobbies SET DEFAULT '[]'::jsonb;

    ALTER TABLE profiles ALTER COLUMN music_preferences DROP DEFAULT;
    ALTER TABLE profiles ALTER COLUMN music_preferences TYPE JSONB USING music_preferences::JSONB;
    ALTER TABLE profiles ALTER COLUMN music_preferences SET DEFAULT '[]'::jsonb;

    ALTER TABLE profiles ALTER COLUMN food_preferences DROP DEFAULT;
    ALTER TABLE profiles ALTER COLUMN food_preferences TYPE JSONB USING food_preferences::JSONB;
    ALTER TABLE profiles ALTER COLUMN food_preferences SET DEFAULT '[]'::jsonb;

    ALTER TABLE profiles ALTER COLUMN personality_traits DROP DEFAULT;
    ALTER TABLE profiles ALTER COLUMN personality_traits TYPE JSONB USING personality_traits::JSONB;
    ALTER TABLE profiles ALTER COLUMN personality_traits SET DEFAULT '[]'::jsonb;

  END IF;
END $$;