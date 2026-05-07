package com.nexus.features.users;

import com.nexus.features.recommendations.RecommendationService;
import com.nexus.features.relationships.RelationshipService;
import com.nexus.util.AuthUtil;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.UUID;

@RestController
public class UsersController {

    private final UsersService usersService;
    private final RelationshipService relationshipService;
    private final RecommendationService recommendationService;

    public UsersController(UsersService usersService,
                           RelationshipService relationshipService,
                           RecommendationService recommendationService) {
        this.usersService = usersService;
        this.relationshipService = relationshipService;
        this.recommendationService = recommendationService;
    }

    // -------------------------------------------------------------------------
    // /me shortcuts
    // -------------------------------------------------------------------------

    @GetMapping("/me")
    public ResponseEntity<?> getMe() {
        try {
            return ResponseEntity.ok(usersService.getPublicUser(AuthUtil.getCurrentUserId()));
        } catch (NoSuchElementException e) {
            return ResponseEntity.status(404).body(Map.of("message", "User not found"));
        }
    }

    @GetMapping("/me/profile")
    public ResponseEntity<?> getMyProfileData() {
        try {
            return ResponseEntity.ok(usersService.getUserProfileData(AuthUtil.getCurrentUserId()));
        } catch (NoSuchElementException e) {
            return ResponseEntity.status(404).body(Map.of("message", "User not found"));
        }
    }

    @GetMapping("/me/bio")
    public ResponseEntity<?> getMyBioData() {
        try {
            return ResponseEntity.ok(usersService.getUserBioData(AuthUtil.getCurrentUserId()));
        } catch (NoSuchElementException e) {
            return ResponseEntity.status(404).body(Map.of("message", "User not found"));
        }
    }

    // -------------------------------------------------------------------------
    // /users/:id endpoints
    // -------------------------------------------------------------------------

    @GetMapping("/users/{id}")
    public ResponseEntity<?> getPublicUserById(@PathVariable UUID id) {
        try {
            if (!hasAccess(AuthUtil.getCurrentUserId(), id)) {
                return ResponseEntity.status(404).body(Map.of("message", "User not found"));
            }
            return ResponseEntity.ok(usersService.getPublicUser(id));
        } catch (NoSuchElementException e) {
            return ResponseEntity.status(404).body(Map.of("message", "User not found"));
        }
    }

    @GetMapping("/users/{id}/profile")
    public ResponseEntity<?> getUserProfileById(@PathVariable UUID id) {
        try {
            if (!hasAccess(AuthUtil.getCurrentUserId(), id)) {
                return ResponseEntity.status(404).body(Map.of("message", "User not found"));
            }
            return ResponseEntity.ok(usersService.getUserProfileData(id));
        } catch (NoSuchElementException e) {
            return ResponseEntity.status(404).body(Map.of("message", "User not found"));
        }
    }

    @GetMapping("/users/{id}/bio")
    public ResponseEntity<?> getUserBioById(@PathVariable UUID id) {
        try {
            if (!hasAccess(AuthUtil.getCurrentUserId(), id)) {
                return ResponseEntity.status(404).body(Map.of("message", "User not found"));
            }
            return ResponseEntity.ok(usersService.getUserBioData(id));
        } catch (NoSuchElementException e) {
            return ResponseEntity.status(404).body(Map.of("message", "User not found"));
        }
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    private boolean hasAccess(UUID viewerId, UUID targetId) {
        if (viewerId.equals(targetId)) return true;
        String status = relationshipService.getRelationshipStatus(viewerId, targetId);
        if (!"none".equals(status)) return true;
        List<String> recs = recommendationService.getTopRecommendations(viewerId);
        return recs.contains(targetId.toString());
    }
}