package com.nexus.features.profiles;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Service;
import java.util.*;

@Service
public class ProfileService {

    private final JdbcTemplate db;
    private final ObjectMapper objectMapper;

    public ProfileService(JdbcTemplate db, ObjectMapper objectMapper) {
        this.db = db;
        this.objectMapper = objectMapper;
    }

    public RowMapper<Profile> profileRowMapper() {
        return (rs, rowNum) -> {
            Profile p = new Profile();
            p.setUserId((UUID) rs.getObject("user_id"));
            p.setFirstName(rs.getString("first_name"));
            p.setLastName(rs.getString("last_name"));
            if (rs.getDate("birthdate") != null)
                p.setBirthdate(rs.getDate("birthdate").toLocalDate());
            p.setGender(rs.getString("gender"));
            p.setBio(rs.getString("bio"));
            p.setProfilePicture(rs.getString("profile_picture"));
            p.setCity(rs.getString("city"));
            double lat = rs.getDouble("latitude");
            p.setLatitude(rs.wasNull() ? null : lat);
            double lon = rs.getDouble("longitude");
            p.setLongitude(rs.wasNull() ? null : lon);
            p.setInterests(parseJsonArray(rs.getString("interests")));
            p.setHobbies(parseJsonArray(rs.getString("hobbies")));
            p.setMusicPreferences(parseJsonArray(rs.getString("music_preferences")));
            p.setFoodPreferences(parseJsonArray(rs.getString("food_preferences")));
            p.setPersonalityTraits(parseJsonArray(rs.getString("personality_traits")));
            p.setMatchPreferences(parseJsonArray(rs.getString("match_preferences")));
            int maxDist = rs.getInt("max_distance_km");
            p.setMaxDistanceKm(rs.wasNull() ? null : maxDist);
            return p;
        };
    }

    private List<String> parseJsonArray(String json) {
        if (json == null || json.isBlank()) return new ArrayList<>();
        try {
            return objectMapper.readValue(json, new TypeReference<List<String>>() {});
        } catch (Exception e) {
            return new ArrayList<>();
        }
    }

    public Optional<Profile> findByUserId(UUID userId) {
        try {
            Profile p = db.queryForObject(
                "SELECT * FROM profiles WHERE user_id = ?",
                profileRowMapper(), userId
            );
            return Optional.ofNullable(p);
        } catch (EmptyResultDataAccessException e) {
            return Optional.empty();
        }
    }

    public Profile getByUserId(UUID userId) {
        return findByUserId(userId)
            .orElseThrow(() -> new NoSuchElementException("Profile not found"));
    }

    public boolean isProfileComplete(Profile p) {
        return p.getFirstName() != null && !p.getFirstName().isBlank()
            && p.getLastName() != null && !p.getLastName().isBlank()
            && p.getBio() != null && !p.getBio().isBlank()
            && p.getCity() != null
            && p.getInterests() != null && !p.getInterests().isEmpty()
            && p.getHobbies() != null && !p.getHobbies().isEmpty()
            && p.getMusicPreferences() != null && !p.getMusicPreferences().isEmpty()
            && p.getFoodPreferences() != null && !p.getFoodPreferences().isEmpty()
            && p.getPersonalityTraits() != null && !p.getPersonalityTraits().isEmpty();
    }

    public Map<String, Object> getRawProfile(UUID userId) {
        try {
            return db.queryForMap("SELECT * FROM profiles WHERE user_id = ?", userId);
        } catch (EmptyResultDataAccessException e) {
            throw new NoSuchElementException("Profile not found");
        }
    }

    public void createProfile(UUID userId, Map<String, Object> fields) {
        db.update(
            """
            INSERT INTO profiles (
                user_id, first_name, last_name, birthdate, gender, bio,
                profile_picture, city, latitude, longitude, max_distance_km,
                interests, hobbies, music_preferences,
                food_preferences, personality_traits, match_preferences
            ) VALUES (?,?,?,CAST(? AS date),?,?,?,?,?,?,?,
                CAST(? AS jsonb),CAST(? AS jsonb),CAST(? AS jsonb),
                CAST(? AS jsonb),CAST(? AS jsonb),CAST(? AS jsonb))
            """,
            userId,
            fields.get("first_name"),
            fields.get("last_name"),
            toDateString(fields.get("birthdate")),
            fields.get("gender"),
            fields.get("bio"),
            fields.get("profile_picture"),
            fields.get("city"),
            fields.get("latitude"),
            fields.get("longitude"),
            fields.get("max_distance_km"),
            toJsonString(fields.getOrDefault("interests", "[]")),
            toJsonString(fields.getOrDefault("hobbies", "[]")),
            toJsonString(fields.getOrDefault("music_preferences", "[]")),
            toJsonString(fields.getOrDefault("food_preferences", "[]")),
            toJsonString(fields.getOrDefault("personality_traits", "[]")),
            toJsonString(fields.getOrDefault("match_preferences", "[\"location\",\"age\",\"hobbies\",\"music\",\"connections\"]"))
        );
    }

    public void updateProfile(UUID userId, Map<String, Object> updates) {
        if (updates.isEmpty()) return;

        Set<String> protected_ = Set.of("id", "user_id", "created_at", "updated_at", "email");
        updates.keySet().removeAll(protected_);

        if (updates.isEmpty()) return;

        List<String> jsonbFields = List.of(
            "interests", "hobbies", "music_preferences",
            "food_preferences", "personality_traits", "match_preferences"
        );

        StringBuilder sql = new StringBuilder("UPDATE profiles SET ");
        List<Object> params = new ArrayList<>();

        List<String> keys = new ArrayList<>(updates.keySet());
        for (int i = 0; i < keys.size(); i++) {
            String key = keys.get(i);
            Object val = updates.get(key);
            if (i > 0) sql.append(", ");
            if (jsonbFields.contains(key)) {
                sql.append(key).append(" = CAST(? AS jsonb)");
                if (val instanceof List) {
                    try {
                        val = objectMapper.writeValueAsString(val);
                    } catch (Exception ignored) {}
                } else if (val == null) {
                    val = "[]";
                }
            } else if ("birthdate".equals(key)) {
                sql.append(key).append(" = CAST(? AS date)");
                if (val instanceof String s && s.contains("T")) {
                    val = s.split("T")[0];
                }
            } else {
                sql.append(key).append(" = ?");
            }
            params.add(val);
        }

        sql.append(", updated_at = NOW() WHERE user_id = ?");
        params.add(userId);

        db.update(sql.toString(), params.toArray());
    }

    private String toDateString(Object val) {
        if (val == null) return null;
        String s = val.toString();
        return s.contains("T") ? s.split("T")[0] : s;
    }

    private String toJsonString(Object val) {
        if (val instanceof String s) return s;
        try {
            return objectMapper.writeValueAsString(val);
        } catch (Exception e) {
            return "[]";
        }
    }
}