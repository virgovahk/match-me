import { pool } from "../../db";
import { Profile } from "./profiles.types";

export interface ProfileData {
  user_id: string;
  first_name: string;
  last_name: string;
  birthdate: string;
  gender: string;
  bio: string;

  profile_picture?: string;
  city?: string;
  latitude?: number;
  longitude?: number;

  interests?: string[];
  hobbies?: string[];
  music_preferences?: string[];
  food_preferences?: string[];
  personality_traits?: string[];

  match_preferences?: string[] | string;

  looking_for?: string;
  max_distance_km?: number;
}

export const mapProfileDataToProfile = (data: ProfileData): Profile => {
  return {
    userId: data.user_id,

    firstName: data.first_name,
    lastName: data.last_name,
    birthdate: new Date(data.birthdate),
    gender: data.gender,
    bio: data.bio,

    pictureUrl: data.profile_picture ?? undefined,

    city: data.city,
    latitude: data.latitude,
    longitude: data.longitude,

    interests: (() => {
      if (!data.interests) return [];
      if (Array.isArray(data.interests)) return data.interests;
      if (typeof data.interests === "string") {
        try {
          return JSON.parse(data.interests);
        } catch {
          return [data.interests];
        }
      }
      return [];
    })(),
    hobbies: (() => {
      if (!data.hobbies) return [];
      if (Array.isArray(data.hobbies)) return data.hobbies;
      if (typeof data.hobbies === "string") {
        try {
          return JSON.parse(data.hobbies);
        } catch {
          return [data.hobbies];
        }
      }
      return [];
    })(),
    musicPreferences: (() => {
      if (!data.music_preferences) return [];
      if (Array.isArray(data.music_preferences)) return data.music_preferences;
      if (typeof data.music_preferences === "string") {
        try {
          return JSON.parse(data.music_preferences);
        } catch {
          return [data.music_preferences];
        }
      }
      return [];
    })(),
    foodPreferences: (() => {
      if (!data.food_preferences) return [];
      if (Array.isArray(data.food_preferences)) return data.food_preferences;
      if (typeof data.food_preferences === "string") {
        try {
          return JSON.parse(data.food_preferences);
        } catch {
          return [data.food_preferences];
        }
      }
      return [];
    })(),
    personalityTraits: (() => {
      if (!data.personality_traits) return [];
      if (Array.isArray(data.personality_traits)) return data.personality_traits;
      if (typeof data.personality_traits === "string") {
        try {
          return JSON.parse(data.personality_traits);
        } catch {
          return [data.personality_traits];
        }
      }
      return [];
    })(),

    matchPreferences:
      typeof data.match_preferences === "string"
        ? (() => {
            try {
              return JSON.parse(data.match_preferences) as string[];
            } catch {
              return [];
            }
          })()
        : data.match_preferences ?? [],

    lookingFor: data.looking_for,
    maxDistanceKm: data.max_distance_km,
  };
};


export const createProfile = async (
  data: ProfileData
): Promise<Profile> => {
  const {
    user_id,
    first_name,
    last_name,
    birthdate,
    gender,
    bio,
    profile_picture,
    city,
    latitude,
    longitude,
    match_preferences,
  } = data;

  const result = await pool.query(
    `
    INSERT INTO profiles (
      user_id, first_name, last_name, birthdate, gender, bio, profile_picture, city, latitude, longitude, match_preferences
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
    RETURNING *
    `,
    [
      user_id,
      first_name,
      last_name,
      birthdate,
      gender,
      bio,
      profile_picture,
      city,
      latitude,
      longitude,
      JSON.stringify(match_preferences ?? []),
    ],
  );

  return mapProfileDataToProfile(result.rows[0]);
};

export const getProfileByUserId = async (
  user_id: string
): Promise<Profile> => {
  const result = await pool.query(`SELECT * FROM profiles WHERE user_id = $1`, [
    user_id,
  ]);

  if (result.rowCount === 0) {
    throw new Error("Profile not found");
  }

  return mapProfileDataToProfile(result.rows[0]);
};

export const getRawProfileByUserId = async (user_id: string) => {
  const result = await pool.query(`SELECT * FROM profiles WHERE user_id = $1`, [
    user_id,
  ]);

  if (result.rowCount === 0) {
    throw new Error("Profile not found");
  }

  return result.rows[0];
};

export const updateProfileByUserId = async (
  user_id: string,
  updates: Partial<ProfileData>
): Promise<Profile> => {
  const fields = Object.keys(updates);

  if (fields.length === 0) {
    throw new Error("No fields provided for update");
  }

  const setClause = fields
    .map((field, index) => `${field} = $${index + 1}`)
    .join(", ");

  const values = Object.entries(updates).map(([key, val]) => {
    if (val === null) return null;
    if (val === "null") return null;

    const jsonbFields = [
      "interests",
      "hobbies",
      "music_preferences",
      "food_preferences",
      "personality_traits",
      "match_preferences",
    ];

    if (jsonbFields.includes(key)) {
      if (Array.isArray(val)) {
        return JSON.stringify(val);
      }
      if (typeof val === "string") {
        return JSON.stringify([val]);
      }
      if (typeof val === "object" && val !== null) {
        return JSON.stringify(val);
      }
    }

    if (Array.isArray(val) || (typeof val === "object" && val !== null)) {
      return JSON.stringify(val);
    }

    return val;
  });

  console.log("[profiles.service] updateProfileByUserId", {
    user_id,
    fields,
    values,
  });

  const result = await pool.query(
    `
    UPDATE profiles
    SET ${setClause}, updated_at = NOW()
    WHERE user_id = $${fields.length + 1}
    RETURNING *
    `,
    [...values, user_id],
  );

  if (result.rowCount === 0) {
    throw new Error("Profile not found");
  }

  return mapProfileDataToProfile(result.rows[0]);
};

