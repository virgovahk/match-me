import { Profile } from "./profiles.types";

export const isProfileComplete = (profile: Profile): boolean => {
  return (
    profile.firstName.trim().length > 0 &&
    profile.lastName.trim().length > 0 &&
    profile.bio.trim().length > 0 &&
    profile.city !== undefined &&
    profile.interests.length > 0 &&
    profile.hobbies.length > 0 &&
    profile.musicPreferences.length > 0 &&
    profile.foodPreferences.length > 0 &&
    profile.personalityTraits.length > 0
  );
};
