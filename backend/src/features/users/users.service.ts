import { pool } from "../../db";

export const getUserById = async (userId: string) => {
  const result = await pool.query(
    `SELECT id, email, created_at FROM users WHERE id = $1`,
    [userId]
  );
  if (result.rowCount === 0) throw new Error("User not found");
  return result.rows[0];
};

export const getPublicUser = async (userId: string) => {
  const result = await pool.query(
    `SELECT user_id AS id, first_name, last_name, profile_picture
     FROM profiles WHERE user_id = $1`,
    [userId]
  );
  if (result.rowCount === 0) throw new Error("User not found");
  return result.rows[0];
};

export const getUserProfileData = async (userId: string) => {
  const result = await pool.query(
    `SELECT user_id AS id, first_name, last_name, bio, gender, birthdate, city, looking_for
     FROM profiles WHERE user_id = $1`,
    [userId]
  );
  if (result.rowCount === 0) throw new Error("User not found");
  return result.rows[0];
};

export const getUserBioData = async (userId: string) => {
  const result = await pool.query(
    `SELECT user_id AS id, interests, hobbies, music_preferences, food_preferences,
            personality_traits, city, birthdate
     FROM profiles WHERE user_id = $1`,
    [userId]
  );
  if (result.rowCount === 0) throw new Error("User not found");
  return result.rows[0];
};
