package com.nexus.features.recommendations;

import com.nexus.features.profiles.Profile;
import com.nexus.features.profiles.ProfileService;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class RecommendationService {

    private static final int DEFAULT_MAX_DISTANCE_KM = 100;
    private static final int MIN_RECOMMENDATION_SCORE = 40;

    private final JdbcTemplate db;
    private final ProfileService profileService;

    public RecommendationService(JdbcTemplate db, ProfileService profileService) {
        this.db = db;
        this.profileService = profileService;
    }

    public List<String> getTopRecommendations(UUID currentUserId) {
        Profile currentUser = profileService.getByUserId(currentUserId);

        List<Profile> candidates = fetchCandidateProfiles(currentUserId);
        List<Profile> filtered = candidates.stream()
            .filter(c -> isWithinDistance(currentUser, c))
            .collect(Collectors.toList());

        List<ScoredUser> scored = filtered.stream()
            .map(candidate -> {
                int mutualFriends = getMutualFriendsCount(currentUserId, candidate.getUserId());
                List<String> prefs = currentUser.getMatchPreferences();
                if (prefs == null || prefs.isEmpty()) {
                    prefs = List.of("location", "age", "hobbies", "music", "connections");
                }
                int score = calculateScore(currentUser, candidate, mutualFriends, prefs);
                return new ScoredUser(candidate.getUserId().toString(), score);
            })
            .filter(s -> s.score >= MIN_RECOMMENDATION_SCORE)
            .sorted((a, b) -> b.score - a.score)
            .limit(10)
            .collect(Collectors.toList());

        return scored.stream().map(s -> s.userId).collect(Collectors.toList());
    }

    private boolean isWithinDistance(Profile currentUser, Profile candidate) {
        int radius = currentUser.getMaxDistanceKm() != null
            ? currentUser.getMaxDistanceKm()
            : DEFAULT_MAX_DISTANCE_KM;

        if (currentUser.getLatitude() != null && currentUser.getLongitude() != null
                && candidate.getLatitude() != null && candidate.getLongitude() != null) {

            double distKm = haversineKm(
                currentUser.getLatitude(), currentUser.getLongitude(),
                candidate.getLatitude(), candidate.getLongitude()
            );

            boolean withinCurrentUser = distKm <= radius;
            boolean withinCandidate = candidate.getMaxDistanceKm() == null
                || distKm <= candidate.getMaxDistanceKm();
            return withinCurrentUser && withinCandidate;
        }

        // No GPS — fall back to city name comparison
        if (currentUser.getCity() != null && candidate.getCity() != null) {
            return distanceIsClose(currentUser.getCity(), candidate.getCity());
        }

        return true;
    }

    private int calculateScore(Profile currentUser, Profile candidate,
                                int mutualFriends, List<String> prefs) {
        int score = 0;

        // 1. Location
        if (currentUser.getLatitude() != null && currentUser.getLongitude() != null
                && candidate.getLatitude() != null && candidate.getLongitude() != null) {

            double distKm = haversineKm(
                currentUser.getLatitude(), currentUser.getLongitude(),
                candidate.getLatitude(), candidate.getLongitude()
            );
            int maxPoints = prefs.contains("location") ? 30 : 10;
            if (distKm < 10)       score += maxPoints;
            else if (distKm < 50)  score += Math.round(maxPoints * 0.7f);
            else if (distKm < 100) score += Math.round(maxPoints * 0.4f);
            else                   score += Math.round(maxPoints * 0.1f);

        } else if (prefs.contains("location")
                && currentUser.getCity() != null && candidate.getCity() != null) {
            if (currentUser.getCity().equalsIgnoreCase(candidate.getCity())) score += 30;
            else if (distanceIsClose(currentUser.getCity(), candidate.getCity())) score += 15;
        }

        // 2. Age (gradient by year difference)
        if (prefs.contains("age") && currentUser.getBirthdate() != null
                && candidate.getBirthdate() != null) {
            int age1 = getAge(currentUser.getBirthdate().toString());
            int age2 = getAge(candidate.getBirthdate().toString());
            int ageDiff = Math.abs(age1 - age2);
            if (ageDiff <= 1)      score += 20;
            else if (ageDiff <= 3) score += 15;
            else if (ageDiff <= 5) score += 10;
            else if (ageDiff <= 8) score += 5;
        }

        // 3. Hobbies
        if (prefs.contains("hobbies")) {
            int mutualHobbies = countCommon(currentUser.getHobbies(), candidate.getHobbies());
            score += Math.min(mutualHobbies * 10, 50);
        }

        // 4. Mutual connections
        if (prefs.contains("connections")) {
            score += Math.min(mutualFriends * 10, 50);
        }

        // 5. Music
        if (prefs.contains("music")) {
            int mutualMusic = countCommon(currentUser.getMusicPreferences(), candidate.getMusicPreferences());
            score += Math.min(mutualMusic * 5, 40);
        }

        // 6. Interests
        if (prefs.contains("interests")) {
            int mutualInterests = countCommon(currentUser.getInterests(), candidate.getInterests());
            score += Math.min(mutualInterests * 5, 25);
        }

        // 7. Food preferences
        if (prefs.contains("food")) {
            int mutualFood = countCommon(currentUser.getFoodPreferences(), candidate.getFoodPreferences());
            score += Math.min(mutualFood * 5, 25);
        }

        // 8. Personality traits
        if (prefs.contains("personality")) {
            int mutualPersonality = countCommon(currentUser.getPersonalityTraits(), candidate.getPersonalityTraits());
            score += Math.min(mutualPersonality * 5, 25);
        }

        return score;
    }

    private List<Profile> fetchCandidateProfiles(UUID currentUserId) {
        return db.query(
            """
            SELECT * FROM profiles
            WHERE user_id != ?
              AND user_id NOT IN (
                SELECT CASE WHEN sender_id = ? THEN receiver_id ELSE sender_id END
                FROM connections
                WHERE (sender_id = ? OR receiver_id = ?)
                  AND status IN ('connected','requested','rejected')
              )
              AND user_id NOT IN (
                SELECT dismissed_user_id FROM dismissed_recommendations WHERE user_id = ?
              )
              AND first_name IS NOT NULL
            """,
            profileService.profileRowMapper(),
            currentUserId, currentUserId, currentUserId, currentUserId, currentUserId
        );
    }

    private int getMutualFriendsCount(UUID userId, UUID candidateId) {
        Integer count = db.queryForObject(
            """
            SELECT COUNT(*) FROM (
                SELECT CASE WHEN sender_id = ? THEN receiver_id ELSE sender_id END AS friend_id
                FROM connections WHERE (sender_id = ? OR receiver_id = ?) AND status = 'connected'
            ) uf
            JOIN (
                SELECT CASE WHEN sender_id = ? THEN receiver_id ELSE sender_id END AS friend_id
                FROM connections WHERE (sender_id = ? OR receiver_id = ?) AND status = 'connected'
            ) cf ON uf.friend_id = cf.friend_id
            WHERE uf.friend_id != ? AND uf.friend_id != ?
            """,
            Integer.class,
            userId, userId, userId,
            candidateId, candidateId, candidateId,
            userId, candidateId
        );
        return count != null ? count : 0;
    }

    private double haversineKm(double lat1, double lon1, double lat2, double lon2) {
        final double R = 6371;
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
            + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
            * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    private boolean distanceIsClose(String city1, String city2) {
        String c1 = city1.trim().toLowerCase();
        String c2 = city2.trim().toLowerCase();
        return c1.equals(c2) || c1.split(" ")[0].equals(c2.split(" ")[0]);
    }

    private int getAge(String birthdate) {
        long diffMs = System.currentTimeMillis() - java.sql.Date.valueOf(birthdate).getTime();
        return (int) (diffMs / (1000L * 60 * 60 * 24 * 365.25));
    }

    // Normalisation: both sides are converted to lowercase before comparison so that
    // values stored with different casing are treated as equal.
    // e.g. "Hiking", "hiking", and "HIKING" all map to "hiking" and count as one match.
    //
    // Quick test (manual):
    //   countCommon(List.of("Hiking", "Reading"), List.of("HIKING", "gaming"))
    //   → setA = {"hiking", "reading"}
    //   → "HIKING".toLowerCase() = "hiking" ∈ setA  ✓
    //   → "gaming".toLowerCase() = "gaming" ∉ setA
    //   → result: 1
    private int countCommon(List<String> a, List<String> b) {
        if (a == null || b == null) return 0;
        Set<String> setA = a.stream().map(String::toLowerCase).collect(Collectors.toSet());
        return (int) b.stream().filter(x -> setA.contains(x.toLowerCase())).count();
    }

    private record ScoredUser(String userId, int score) {}
}