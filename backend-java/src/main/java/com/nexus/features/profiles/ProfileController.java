package com.nexus.features.profiles;

import com.nexus.features.recommendations.RecommendationService;
import com.nexus.features.relationships.RelationshipService;
import com.nexus.util.AuthUtil;
import com.nexus.util.ProfileJsonUtil;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.*;

@RestController
@RequestMapping("/profiles")
public class ProfileController {

    private static final Logger log = LoggerFactory.getLogger(ProfileController.class);

    private final ProfileService profileService;
    private final RelationshipService relationshipService;
    private final RecommendationService recommendationService;
    private final JdbcTemplate db;

    @Value("${upload.dir}")
    private String uploadDir;

    public ProfileController(ProfileService profileService,
                             RelationshipService relationshipService,
                             RecommendationService recommendationService,
                             JdbcTemplate db) {
        this.profileService = profileService;
        this.relationshipService = relationshipService;
        this.recommendationService = recommendationService;
        this.db = db;
    }

    /** POST /profiles — create profile (JSON body) */
    @PostMapping(consumes = {"application/json", "multipart/form-data", "*/*"})
    public ResponseEntity<?> createProfile(
            @RequestBody(required = false) Map<String, Object> jsonBody,
            @RequestParam(required = false) MultipartFile profile_picture) {
        try {
            UUID userId = AuthUtil.getCurrentUserId();
            Map<String, Object> data = jsonBody != null ? new HashMap<>(jsonBody) : new HashMap<>();

            if (profile_picture != null && !profile_picture.isEmpty()) {
                String url = saveFile(profile_picture);
                data.put("profile_picture", url);
            }

            data.replaceAll((k, v) -> "null".equals(v) ? null : v);

            profileService.createProfile(userId, data);
            Map<String, Object> raw = profileService.getRawProfile(userId);
            return ResponseEntity.status(201).body(ProfileJsonUtil.parseJsonbFields(raw));
        } catch (Exception e) {
            log.error("Failed to create profile", e);
            return ResponseEntity.badRequest().body(Map.of("message", "Failed to create profile. Please try again."));
        }
    }

    /** GET /profiles/me */
    @GetMapping("/me")
    public ResponseEntity<?> getMyProfile() {
        try {
            UUID userId = AuthUtil.getCurrentUserId();
            Map<String, Object> profile = profileService.getRawProfile(userId);
            ProfileJsonUtil.parseJsonbFields(profile);

            String email = db.queryForObject(
                "SELECT email FROM users WHERE id = ?", String.class, userId
            );
            profile.put("email", email);

            return ResponseEntity.ok(profile);
        } catch (Exception e) {
            return ResponseEntity.status(404).body(Map.of("message", "Profile not found."));
        }
    }

    /** PUT /profiles/me */
    @PutMapping("/me")
    public ResponseEntity<?> updateMyProfile(@RequestBody Map<String, Object> body) {
        try {
            UUID userId = AuthUtil.getCurrentUserId();
            profileService.updateProfile(userId, new HashMap<>(body));
            Map<String, Object> updated = profileService.getRawProfile(userId);
            return ResponseEntity.ok(ProfileJsonUtil.parseJsonbFields(updated));
        } catch (Exception e) {
            log.error("Failed to update profile", e);
            return ResponseEntity.badRequest().body(Map.of("message", "Failed to update profile. Please try again."));
        }
    }

    /** POST /profiles/me/picture */
    @PostMapping("/me/picture")
    public ResponseEntity<?> uploadPicture(
            @RequestParam(value = "file", required = false) MultipartFile file,
            @RequestParam(value = "profile_picture", required = false) MultipartFile profilePicture) {
        try {
            UUID userId = AuthUtil.getCurrentUserId();
            MultipartFile uploadedFile = file != null ? file : profilePicture;
            if (uploadedFile == null || uploadedFile.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("message", "No file uploaded"));
            }
            String url = saveFile(uploadedFile);
            profileService.updateProfile(userId, Map.of("profile_picture", url));
            return ResponseEntity.ok(Map.of("url", url));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("message", "Failed to upload picture. Please try again."));
        }
    }

    /** GET /profiles/:userId */
    @GetMapping("/{userId}")
    public ResponseEntity<?> getProfileByUserId(@PathVariable UUID userId) {
        try {
            UUID viewerId = AuthUtil.getCurrentUserId();
            String status = relationshipService.getRelationshipStatus(viewerId, userId);

            boolean canView = !"none".equals(status);
            if (!canView) {
                List<String> recs = recommendationService.getTopRecommendations(viewerId);
                if (!recs.contains(userId.toString())) {
                    return ResponseEntity.status(404).body(Map.of("message", "User not found"));
                }
            }

            Map<String, Object> profile = profileService.getRawProfile(userId);
            ProfileJsonUtil.parseJsonbFields(profile);
            profile.remove("email");
            return ResponseEntity.ok(profile);
        } catch (Exception e) {
            return ResponseEntity.status(404).body(Map.of("message", "Profile not found."));
        }
    }

    private String saveFile(MultipartFile file) throws Exception {
        File dir = new File(uploadDir);
        if (!dir.exists()) dir.mkdirs();
        String filename = UUID.randomUUID() + "_" + file.getOriginalFilename();
        Path path = Paths.get(uploadDir, filename);
        Files.write(path, file.getBytes());
        return "/uploads/" + filename;
    }
}