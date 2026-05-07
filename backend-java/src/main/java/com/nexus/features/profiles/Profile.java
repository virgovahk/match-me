package com.nexus.features.profiles;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/**
 * Represents a row from the profiles table.
 * Equivalent of Profile interface in profiles.types.ts
 */
@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class Profile {

    @JsonProperty("user_id")
    private UUID userId;

    @JsonProperty("first_name")
    private String firstName;

    @JsonProperty("last_name")
    private String lastName;

    private LocalDate birthdate;
    private String gender;
    private String bio;

    @JsonProperty("profile_picture")
    private String profilePicture;

    private String city;
    private Double latitude;
    private Double longitude;

    private List<String> interests;
    private List<String> hobbies;

    @JsonProperty("music_preferences")
    private List<String> musicPreferences;

    @JsonProperty("food_preferences")
    private List<String> foodPreferences;

    @JsonProperty("personality_traits")
    private List<String> personalityTraits;

    @JsonProperty("match_preferences")
    private List<String> matchPreferences;

    @JsonProperty("max_distance_km")
    private Integer maxDistanceKm;
}