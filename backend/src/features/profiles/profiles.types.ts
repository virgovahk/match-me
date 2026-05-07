
export interface Profile {
  userId: string;

  firstName: string;
  lastName: string;
  birthdate: Date;
  gender: string;
  bio: string;

  pictureUrl?: string;

  city?: string;
  latitude?: number;
  longitude?: number;

  interests: string[];
  hobbies: string[];
  musicPreferences: string[];
  foodPreferences: string[];
  personalityTraits: string[];

  matchPreferences?: string[];

  lookingFor?: string;
  maxDistanceKm?: number;
}
