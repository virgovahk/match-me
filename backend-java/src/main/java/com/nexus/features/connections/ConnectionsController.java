package com.nexus.features.connections;

import com.nexus.features.profiles.ProfileService;
import com.nexus.features.relationships.RelationshipService;
import com.nexus.util.AuthUtil;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/connections")
public class ConnectionsController {

    private final JdbcTemplate db;
    private final RelationshipService relationshipService;
    private final ProfileService profileService;

    public ConnectionsController(JdbcTemplate db,
                                  RelationshipService relationshipService,
                                  ProfileService profileService) {
        this.db = db;
        this.relationshipService = relationshipService;
        this.profileService = profileService;
    }

    /** GET /connections — returns list of connected user IDs only */
    @GetMapping
    public ResponseEntity<?> getConnections() {
        try {
            UUID userId = AuthUtil.getCurrentUserId();
            List<UUID> connectedIds = relationshipService.getConnectedUserIds(userId);

            List<Map<String, String>> result = connectedIds.stream()
                .map(id -> {
                    try {
                        profileService.getByUserId(id); // verify profile exists
                        return Map.of("id", id.toString());
                    } catch (Exception ignored) {}
                    return null;
                })
                .filter(m -> m != null)
                .collect(Collectors.toList());

            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("message", e.getMessage()));
        }
    }

    /** POST /connections/request */
    @PostMapping("/request")
    public ResponseEntity<?> sendRequest(@RequestBody Map<String, String> body) {
        try {
            UUID senderId = AuthUtil.getCurrentUserId();
            UUID receiverId = UUID.fromString(body.get("receiverId"));

            Integer count = db.queryForObject(
                """
                SELECT COUNT(*) FROM connections
                WHERE (sender_id = ? AND receiver_id = ?)
                   OR (sender_id = ? AND receiver_id = ?)
                """,
                Integer.class, senderId, receiverId, receiverId, senderId
            );
            if (count != null && count > 0) {
                return ResponseEntity.badRequest()
                    .body(Map.of("message", "Connection already exists or pending"));
            }

            db.update(
                "INSERT INTO connections (sender_id, receiver_id, status) VALUES (?, ?, 'requested')",
                senderId, receiverId
            );
            return ResponseEntity.ok(Map.of("message", "Connection request sent"));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("message", e.getMessage()));
        }
    }

    /** POST /connections/accept */
    @PostMapping("/accept")
    public ResponseEntity<?> acceptRequest(@RequestBody Map<String, String> body) {
        try {
            UUID receiverId = AuthUtil.getCurrentUserId();
            UUID senderId = UUID.fromString(body.get("senderId"));

            int updated = db.update(
                """
                UPDATE connections SET status = 'connected'
                WHERE sender_id = ? AND receiver_id = ? AND status = 'requested'
                """,
                senderId, receiverId
            );
            if (updated == 0) {
                return ResponseEntity.status(404).body(Map.of("message", "No pending request found"));
            }
            return ResponseEntity.ok(Map.of("message", "Connection request accepted"));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("message", e.getMessage()));
        }
    }

    /** POST /connections/reject */
    @PostMapping("/reject")
    public ResponseEntity<?> rejectRequest(@RequestBody Map<String, String> body) {
        try {
            UUID receiverId = AuthUtil.getCurrentUserId();
            UUID senderId = UUID.fromString(body.get("senderId"));

            int updated = db.update(
                """
                UPDATE connections SET status = 'rejected'
                WHERE sender_id = ? AND receiver_id = ? AND status = 'requested'
                """,
                senderId, receiverId
            );
            if (updated == 0) {
                return ResponseEntity.status(404).body(Map.of("message", "No pending request found"));
            }
            return ResponseEntity.ok(Map.of("message", "Connection request rejected"));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("message", e.getMessage()));
        }
    }

    /** POST /connections/disconnect */
    @PostMapping("/disconnect")
    public ResponseEntity<?> disconnect(@RequestBody Map<String, String> body) {
        try {
            UUID userId = AuthUtil.getCurrentUserId();
            UUID otherUserId = UUID.fromString(body.get("userId"));

            int deleted = db.update(
                """
                DELETE FROM connections
                WHERE ((sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?))
                  AND status = 'connected'
                """,
                userId, otherUserId, otherUserId, userId
            );
            if (deleted == 0) {
                return ResponseEntity.status(404).body(Map.of("message", "Connection not found"));
            }

            // Also delete the chat between these two users
            UUID user1 = userId.toString().compareTo(otherUserId.toString()) < 0 ? userId : otherUserId;
            UUID user2 = userId.toString().compareTo(otherUserId.toString()) < 0 ? otherUserId : userId;
            db.update("DELETE FROM chats WHERE user1_id = ? AND user2_id = ?", user1, user2);

            return ResponseEntity.ok(Map.of("message", "Disconnected successfully"));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("message", e.getMessage()));
        }
    }

    /** GET /connections/pending */
    @GetMapping("/pending")
    public ResponseEntity<?> getPendingRequests() {
        try {
            UUID userId = AuthUtil.getCurrentUserId();
            List<Map<String, Object>> rows = db.queryForList(
                """
                SELECT p.user_id AS id, p.first_name, p.last_name, p.profile_picture
                FROM connections c
                JOIN profiles p ON p.user_id = c.sender_id
                WHERE c.receiver_id = ? AND c.status = 'requested'
                """,
                userId
            );
            return ResponseEntity.ok(rows);
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("message", e.getMessage()));
        }
    }
}