import { pool } from "../../db";
import { mapProfileDataToProfile } from "../profiles/profiles.service";
import { isProfileComplete } from "../profiles/profileCompletion";
import { Profile } from "../profiles/profiles.types";

const DEFAULT_MAX_DISTANCE_KM = 100;
const MIN_RECOMMENDATION_SCORE = 40;

function parseArrayField(field: string | string[] | null | undefined): string[] {
  if (!field) return [];
  if (Array.isArray(field)) return field.map(f => f.trim().toLowerCase()).filter(Boolean);
  return field.split(",").map(f => f.trim().toLowerCase()).filter(Boolean);
}

function getAge(birthdate: string | null | undefined): number | null {
  if (!birthdate) return null;
  const diff = Date.now() - new Date(birthdate).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
}

function distanceIsClose(loc1: string | null | undefined, loc2: string | null | undefined): boolean {
  if (!loc1 || !loc2) return false;
  const l1 = loc1.trim().toLowerCase();
  const l2 = loc2.trim().toLowerCase();
  return l1 === l2 || l1.split(" ")[0] === l2.split(" ")[0];
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function isWithinDistance(currentUser: Profile, candidate: Profile): boolean {
  const currentUserRadius = currentUser.maxDistanceKm ?? DEFAULT_MAX_DISTANCE_KM;
  if (
    currentUser.latitude != null && currentUser.longitude != null &&
    candidate.latitude != null && candidate.longitude != null
  ) {
    const distKm = haversineKm(
      currentUser.latitude, currentUser.longitude,
      candidate.latitude, candidate.longitude
    );
    const withinCurrentUser = distKm <= currentUserRadius;
    const withinCandidate = !candidate.maxDistanceKm || distKm <= candidate.maxDistanceKm;
    return withinCurrentUser && withinCandidate;
  }
  if (currentUser.city && candidate.city) {
    return distanceIsClose(currentUser.city, candidate.city);
  }
  return true;
}

function calculateScore(
  currentUser: Profile,
  candidate: Profile,
  mutualFriendsCount: number,
  matchPreferences: string[]
): number {
  let score = 0;

  const prefers = (key: string) => matchPreferences?.includes(key);

  // 1. Location
  if (
    currentUser.latitude != null && currentUser.longitude != null &&
    candidate.latitude != null && candidate.longitude != null
  ) {
    const distKm = haversineKm(
      currentUser.latitude, currentUser.longitude,
      candidate.latitude, candidate.longitude
    );
    const maxPoints = prefers("location") ? 30 : 10;
    if (distKm < 10) score += maxPoints;
    else if (distKm < 50) score += Math.round(maxPoints * 0.7);
    else if (distKm < 100) score += Math.round(maxPoints * 0.4);
    else score += Math.round(maxPoints * 0.1);
  } else if (prefers("location") && currentUser.city && candidate.city) {
    if (currentUser.city.trim().toLowerCase() === candidate.city.trim().toLowerCase()) {
      score += 30;
    } else if (distanceIsClose(currentUser.city, candidate.city)) {
      score += 15;
    }
  }

  // 2. Age (within 5 years)
  if (prefers("age")) {
    const age1 = currentUser.birthdate ? getAge(currentUser.birthdate.toISOString()) : null;
    const age2 = candidate.birthdate ? getAge(candidate.birthdate.toISOString()) : null;
    if (age1 !== null && age2 !== null && Math.abs(age1 - age2) <= 5) score += 20;
  }

  // 3. Hobbies
  if (prefers("hobbies")) {
    const currentHobbies = parseArrayField(currentUser.hobbies.join(","));
    const candidateHobbies = parseArrayField(candidate.hobbies.join(","));
    const commonHobbies = currentHobbies.filter(h => candidateHobbies.includes(h));
    score += Math.min(commonHobbies.length * 10, 20);
  }

  // 4. Mutual connections
  if (prefers("connections")) {
    score += Math.min(mutualFriendsCount * 10, 20);
  }

  // 5. Music preferences
  if (prefers("music")) {
    const currentMusic = parseArrayField(currentUser.musicPreferences.join(","));
    const candidateMusic = parseArrayField(candidate.musicPreferences.join(","));
    const commonMusic = currentMusic.filter(m => candidateMusic.includes(m));
    score += Math.min(commonMusic.length * 5, 15);
  }

  return score;
}

async function fetchCandidateProfiles(currentUserId: string): Promise<Profile[]> {
  const { rows } = await pool.query(
    `
    SELECT * FROM profiles
    WHERE user_id != $1
      AND user_id NOT IN (
        SELECT CASE
          WHEN sender_id = $1 THEN receiver_id
          ELSE sender_id
        END
        FROM connections
        WHERE (sender_id = $1 OR receiver_id = $1)
          AND status IN ('connected','requested','rejected')
      )
      AND user_id NOT IN (
        SELECT dismissed_user_id
        FROM dismissed_recommendations
        WHERE user_id = $1
      )
    `,
    [currentUserId]
  );

  const profiles: Profile[] = rows.map(mapProfileDataToProfile);
  return profiles.filter(isProfileComplete);
}

async function getMutualFriendsCount(userId: string, candidateId: string): Promise<number> {
  const { rows } = await pool.query(
    `
    SELECT COUNT(*) AS count
    FROM (
      SELECT CASE WHEN sender_id = $1 THEN receiver_id ELSE sender_id END AS friend_id
      FROM connections
      WHERE (sender_id = $1 OR receiver_id = $1) AND status = 'connected'
    ) AS user_friends
    JOIN (
      SELECT CASE WHEN sender_id = $2 THEN receiver_id ELSE sender_id END AS friend_id
      FROM connections
      WHERE (sender_id = $2 OR receiver_id = $2) AND status = 'connected'
    ) AS candidate_friends
      ON user_friends.friend_id = candidate_friends.friend_id
    WHERE user_friends.friend_id != $1
      AND user_friends.friend_id != $2
    `,
    [userId, candidateId]
  );

  return parseInt(rows[0]?.count || "0", 10);
}

export async function getTopRecommendations(currentUserId: string): Promise<string[]> {
  const { rows } = await pool.query(`SELECT * FROM profiles WHERE user_id = $1`, [currentUserId]);
  if (rows.length === 0) throw new Error("Current user not found");

  const currentUser = mapProfileDataToProfile(rows[0]);

  const candidates = await fetchCandidateProfiles(currentUserId);
  const filteredCandidates = candidates.filter(c => isWithinDistance(currentUser, c));

  const scored = await Promise.all(
    filteredCandidates.map(async candidate => {
      const mutualFriends = await getMutualFriendsCount(currentUserId, candidate.userId);
      const score = calculateScore(
        currentUser,
        candidate,
        mutualFriends,
        currentUser.matchPreferences ?? [
          "location",
          "age",
          "hobbies",
          "music",
          "connections",
        ]
      );
      return { userId: candidate.userId, score };
    })
  );

  return scored
    .filter(c => c.score >= MIN_RECOMMENDATION_SCORE)
    .sort((a, b) => b.score - a.score)
    .slice(0, 10)
    .map(c => c.userId);
}