package com.nexus.features.chat;

import com.nexus.util.AuthUtil;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/chats")
public class ChatController {

    private final JdbcTemplate db;

    public ChatController(JdbcTemplate db) {
        this.db = db;
    }

    /** GET /chats */
    @GetMapping
    public ResponseEntity<?> getMyChats() {
        try {
            UUID userId = AuthUtil.getCurrentUserId();
            List<Map<String, Object>> chats = db.queryForList(
                """
                SELECT
                  c.id,
                  c.updated_at,
                  CASE WHEN c.user1_id = ? THEN c.user2_id ELSE c.user1_id END AS other_user_id,
                  p.first_name,
                  p.last_name,
                  p.profile_picture,
                  (SELECT content FROM messages WHERE chat_id = c.id ORDER BY created_at DESC LIMIT 1) AS last_message,
                  (SELECT created_at FROM messages WHERE chat_id = c.id ORDER BY created_at DESC LIMIT 1) AS last_message_at,
                  (SELECT COUNT(*)::int FROM messages WHERE chat_id = c.id AND sender_id != ? AND read_at IS NULL) AS unread_count
                FROM chats c
                JOIN profiles p ON p.user_id = CASE WHEN c.user1_id = ? THEN c.user2_id ELSE c.user1_id END
                WHERE c.user1_id = ? OR c.user2_id = ?
                ORDER BY c.updated_at DESC
                """,
                userId, userId, userId, userId, userId
            );
            return ResponseEntity.ok(chats);
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("message", e.getMessage()));
        }
    }

    /** POST /chats — get or create chat */
    @PostMapping
    public ResponseEntity<?> getOrCreateChat(@RequestBody Map<String, String> body) {
        try {
            UUID userId = AuthUtil.getCurrentUserId();
            UUID otherUserId = UUID.fromString(body.get("otherUserId"));

            // Check they are connected
            Integer connected = db.queryForObject(
                """
                SELECT COUNT(*) FROM connections
                WHERE ((sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?))
                  AND status = 'connected'
                """,
                Integer.class, userId, otherUserId, otherUserId, userId
            );
            if (connected == null || connected == 0) {
                return ResponseEntity.status(403).body(Map.of("message", "Users are not connected"));
            }

            // Ordered pair — user1 < user2
            UUID user1 = userId.compareTo(otherUserId) < 0 ? userId : otherUserId;
            UUID user2 = userId.compareTo(otherUserId) < 0 ? otherUserId : userId;

            Map<String, Object> chat = db.queryForMap(
                """
                INSERT INTO chats (user1_id, user2_id)
                VALUES (?, ?)
                ON CONFLICT (user1_id, user2_id) DO UPDATE SET updated_at = NOW()
                RETURNING id
                """,
                user1, user2
            );
            return ResponseEntity.ok(Map.of("chatId", chat.get("id")));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("message", e.getMessage()));
        }
    }

    /** GET /chats/:chatId/messages */
    @GetMapping("/{chatId}/messages")
    public ResponseEntity<?> getChatMessages(
            @PathVariable UUID chatId,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "10") int limit) {
        try {
            UUID userId = AuthUtil.getCurrentUserId();

            // Verify participant
            Integer count = db.queryForObject(
                "SELECT COUNT(*) FROM chats WHERE id = ? AND (user1_id = ? OR user2_id = ?)",
                Integer.class, chatId, userId, userId
            );
            if (count == null || count == 0) {
                return ResponseEntity.status(404).body(Map.of("message", "Chat not found"));
            }

            int safeLimit = Math.min(50, Math.max(1, limit));
            int offset = (Math.max(1, page) - 1) * safeLimit;

            List<Map<String, Object>> messages = db.queryForList(
                """
                SELECT id, chat_id, sender_id, content, created_at, read_at
                FROM messages
                WHERE chat_id = ?
                ORDER BY created_at DESC
                LIMIT ? OFFSET ?
                """,
                chatId, safeLimit, offset
            );

            // Return in chronological order
            java.util.Collections.reverse(messages);
            return ResponseEntity.ok(messages);
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("message", e.getMessage()));
        }
    }

    /** PUT /chats/:chatId/read */
    @PutMapping("/{chatId}/read")
    public ResponseEntity<?> markAsRead(@PathVariable UUID chatId) {
        try {
            UUID userId = AuthUtil.getCurrentUserId();
            db.update(
                "UPDATE messages SET read_at = NOW() WHERE chat_id = ? AND sender_id != ? AND read_at IS NULL",
                chatId, userId
            );
            return ResponseEntity.ok(Map.of("message", "Marked as read"));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("message", e.getMessage()));
        }
    }
}