package com.nexus.util;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.util.List;
import java.util.Map;

/**
 * Parses JSONB fields in a raw profile map into proper Java Lists.
 * JdbcTemplate returns JSONB columns as PGobject instances (not Strings),
 * but PGobject.toString() returns the raw JSON value, so we use toString()
 * to handle both String and PGobject without a compile-time dependency.
 */
public class ProfileJsonUtil {

    private static final ObjectMapper objectMapper = new ObjectMapper();

    private static final List<String> JSONB_FIELDS = List.of(
        "interests", "hobbies", "music_preferences",
        "food_preferences", "personality_traits", "match_preferences"
    );

    public static Map<String, Object> parseJsonbFields(Map<String, Object> profile) {
        for (String field : JSONB_FIELDS) {
            Object val = profile.get(field);
            if (val == null) {
                profile.put(field, List.of());
            } else if (!(val instanceof List)) {
                try {
                    List<String> parsed = objectMapper.readValue(val.toString(), new TypeReference<>() {});
                    profile.put(field, parsed);
                } catch (Exception ignored) {
                    profile.put(field, List.of());
                }
            }
        }
        return profile;
    }
}