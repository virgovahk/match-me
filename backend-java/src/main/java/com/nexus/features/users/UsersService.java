package com.nexus.features.users;

import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.NoSuchElementException;
import java.util.UUID;

@Service
public class UsersService {

    private final JdbcTemplate db;

    public UsersService(JdbcTemplate db) {
        this.db = db;
    }

    /** /users/:id — name + profile picture */
    public Map<String, Object> getPublicUser(UUID userId) {
        try {
            return db.queryForMap(
                "SELECT user_id AS id, first_name, last_name, profile_picture FROM profiles WHERE user_id = ?",
                userId
            );
        } catch (EmptyResultDataAccessException e) {
            throw new NoSuchElementException("User not found");
        }
    }

    /** /users/:id/profile — about me info */
    public Map<String, Object> getUserProfileData(UUID userId) {
        try {
            return db.queryForMap(
                """
                SELECT user_id AS id, first_name, last_name, bio, gender,
                       birthdate, city
                FROM profiles WHERE user_id = ?
                """,
                userId
            );
        } catch (EmptyResultDataAccessException e) {
            throw new NoSuchElementException("User not found");
        }
    }

    /** /users/:id/bio — biographical data for recommendations */
    public Map<String, Object> getUserBioData(UUID userId) {
        try {
            return db.queryForMap(
                """
                SELECT user_id AS id, interests, hobbies, music_preferences,
                       food_preferences, personality_traits, city, birthdate
                FROM profiles WHERE user_id = ?
                """,
                userId
            );
        } catch (EmptyResultDataAccessException e) {
            throw new NoSuchElementException("User not found");
        }
    }
}