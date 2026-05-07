export interface Profile {
  id?: string;
  user_id?: string;
  first_name: string;
  last_name: string;
  birthdate?: string | null;
  gender?: string | null;
  bio?: string | null;
  profile_picture?: string | null;
  city?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  interests?: string[];
  hobbies?: string[];
  music_preferences?: string[];
  food_preferences?: string[];
  personality_traits?: string[];
  match_preferences?: string[];
  email?: string;
  max_distance_km?: number | null;
}

export interface UserPublic {
  id: string;
  first_name: string;
  last_name: string;
  profile_picture?: string | null;
}

export interface Connection {
  id: string;
  user_id: string;
}

export interface ConnectionRequest {
  id: string;
  first_name: string;
  last_name: string;
  profile_picture?: string | null;
}

export interface Recommendation {
  id: string;
}

export interface Chat {
  id: string;
  other_user_id: string;
  first_name: string;
  last_name: string;
  profile_picture?: string | null;
  last_message?: string | null;
  last_message_at?: string | null;
  unread_count: number;
  updated_at: string;
}

export interface Message {
  id: string;
  chat_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  read_at?: string | null;
}
