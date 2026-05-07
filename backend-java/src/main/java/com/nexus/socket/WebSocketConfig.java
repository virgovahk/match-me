package com.nexus.socket;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.nexus.util.JwtUtil;
import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.socket.*;
import org.springframework.web.socket.config.annotation.*;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

/**
 * WebSocket handler — equivalent of events.ts (Socket.io)
 * Uses Spring's native WebSocket support.
 * The frontend will need to use the native WebSocket API instead of socket.io-client,
 * OR you can add the socket.io server library via a separate dependency.
 *
 * This implementation uses raw WebSocket which is compatible with the browser's
 * native WebSocket API.
 */
@Configuration
@EnableWebSocket
public class WebSocketConfig implements WebSocketConfigurer {

    private final JwtUtil jwtUtil;
    private final JdbcTemplate db;
    private final ObjectMapper objectMapper;

    public WebSocketConfig(JwtUtil jwtUtil, JdbcTemplate db, ObjectMapper objectMapper) {
        this.jwtUtil = jwtUtil;
        this.db = db;
        this.objectMapper = objectMapper;
    }

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        registry.addHandler(new NexusWebSocketHandler(jwtUtil, db, objectMapper), "/ws")
                .setAllowedOrigins("http://localhost:5173", "http://localhost:5174");
    }
}

class NexusWebSocketHandler extends TextWebSocketHandler {

    // userId -> set of sessions (multiple tabs)
    private static final Map<String, Set<WebSocketSession>> userSessions = new ConcurrentHashMap<>();
    // sessionId -> userId
    private static final Map<String, String> sessionUserMap = new ConcurrentHashMap<>();

    private final JwtUtil jwtUtil;
    private final JdbcTemplate db;
    private final ObjectMapper objectMapper;

    public NexusWebSocketHandler(JwtUtil jwtUtil, JdbcTemplate db, ObjectMapper objectMapper) {
        this.jwtUtil = jwtUtil;
        this.db = db;
        this.objectMapper = objectMapper;
    }

    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws Exception {
        // Extract JWT from query param: ws://localhost:3000/ws?token=xxx
        String query = session.getUri() != null ? session.getUri().getQuery() : null;
        String token = extractToken(query);

        if (token == null || !jwtUtil.isValid(token)) {
            session.close(CloseStatus.NOT_ACCEPTABLE);
            return;
        }

        String userId = jwtUtil.extractUserId(token).toString();
        sessionUserMap.put(session.getId(), userId);
        userSessions.computeIfAbsent(userId, k -> ConcurrentHashMap.newKeySet()).add(session);

        // Tell this client who is already online
        for (String onlineUserId : userSessions.keySet()) {
            sendToSession(session, Map.of("type", "user:online", "userId", onlineUserId));
        }

        // Tell everyone else this user is online
        broadcast(Map.of("type", "user:online", "userId", userId), session);
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {
        String userId = sessionUserMap.get(session.getId());
        if (userId == null) return;

        Map<String, Object> payload = objectMapper.readValue(message.getPayload(), Map.class);
        String type = (String) payload.get("type");

        switch (type != null ? type : "") {
            case "chat:join" -> handleChatJoin(session, userId, (String) payload.get("chatId"));
            case "message:send" -> handleMessageSend(userId, payload);
            case "typing:start" -> handleTyping(userId, (String) payload.get("chatId"), "typing:start");
            case "typing:stop"  -> handleTyping(userId, (String) payload.get("chatId"), "typing:stop");
            case "user:status"  -> handleUserStatus(session, (String) payload.get("userId"));
        }
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
        String userId = sessionUserMap.remove(session.getId());
        if (userId == null) return;

        Set<WebSocketSession> sessions = userSessions.get(userId);
        if (sessions != null) {
            sessions.remove(session);
            if (sessions.isEmpty()) {
                userSessions.remove(userId);
                broadcast(Map.of("type", "user:offline", "userId", userId), null);
            }
        }
    }

    private void handleChatJoin(WebSocketSession session, String userId, String chatId) {
        if (chatId == null) return;
        // Mark messages as read
        db.update(
            "UPDATE messages SET read_at = NOW() WHERE chat_id = ?::uuid AND sender_id != ?::uuid AND read_at IS NULL",
            chatId, userId
        );
        // Notify other participant
        sendReadReceipt(chatId, userId);
    }

    private void handleMessageSend(String senderId, Map<String, Object> payload) {
        String chatId = (String) payload.get("chatId");
        String content = (String) payload.get("content");
        if (chatId == null || content == null || content.isBlank()) return;

        // Verify sender is a chat participant
        Integer count = db.queryForObject(
            "SELECT COUNT(*) FROM chats WHERE id = ?::uuid AND (user1_id = ?::uuid OR user2_id = ?::uuid)",
            Integer.class, chatId, senderId, senderId
        );
        if (count == null || count == 0) return;

        // Save message
        Map<String, Object> saved = db.queryForMap(
            "INSERT INTO messages (chat_id, sender_id, content) VALUES (?::uuid, ?::uuid, ?) RETURNING *",
            chatId, senderId, content.trim()
        );

        // Cap messages at 10 per chat
        db.update(
            """
            DELETE FROM messages WHERE id IN (
                SELECT id FROM messages WHERE chat_id = ?::uuid
                ORDER BY created_at DESC OFFSET 10
            )
            """,
            chatId
        );

        db.update("UPDATE chats SET updated_at = NOW() WHERE id = ?::uuid", chatId);

        // Emit message:new to all participants in this chat
        broadcastToChat(chatId, Map.of("type", "message:new", "message", saved));

        // Notify recipient's personal room
        String otherId = getOtherParticipantId(chatId, senderId);
        if (otherId != null) {
            sendToUser(otherId, Map.of("type", "chat:updated", "chatId", chatId));
        }
    }

    private void handleTyping(String userId, String chatId, String eventType) {
        if (chatId == null) return;
        String otherId = getOtherParticipantId(chatId, userId);
        if (otherId != null) {
            sendToUser(otherId, Map.of("type", eventType, "userId", userId));
        }
    }

    private void handleUserStatus(WebSocketSession session, String targetUserId) {
        if (targetUserId == null) return;
        boolean online = userSessions.containsKey(targetUserId)
            && !userSessions.get(targetUserId).isEmpty();
        sendToSession(session, Map.of(
            "type", online ? "user:online" : "user:offline",
            "userId", targetUserId
        ));
    }

    private String getOtherParticipantId(String chatId, String userId) {
        try {
            return db.queryForObject(
                "SELECT CASE WHEN user1_id = ?::uuid THEN user2_id ELSE user1_id END FROM chats WHERE id = ?::uuid",
                String.class, userId, chatId
            );
        } catch (Exception e) {
            return null;
        }
    }

    private void sendReadReceipt(String chatId, String readerId) {
        String otherId = getOtherParticipantId(chatId, readerId);
        if (otherId != null) {
            sendToUser(otherId, Map.of("type", "chat:read", "chatId", chatId));
        }
    }

    private void broadcastToChat(String chatId, Map<String, Object> msg) {
        try {
            Map<String, Object> row = db.queryForMap(
                "SELECT user1_id::text AS u1, user2_id::text AS u2 FROM chats WHERE id = ?::uuid", chatId
            );
            sendToUser((String) row.get("u1"), msg);
            sendToUser((String) row.get("u2"), msg);
        } catch (Exception ignored) {}
    }

    private void sendToUser(String userId, Map<String, Object> msg) {
        Set<WebSocketSession> sessions = userSessions.get(userId);
        if (sessions == null) return;
        for (WebSocketSession s : sessions) {
            sendToSession(s, msg);
        }
    }

    private void sendToSession(WebSocketSession session, Map<String, Object> msg) {
        try {
            if (session.isOpen()) {
                session.sendMessage(new TextMessage(objectMapper.writeValueAsString(msg)));
            }
        } catch (Exception ignored) {}
    }

    private void broadcast(Map<String, Object> msg, WebSocketSession exclude) {
        for (Set<WebSocketSession> sessions : userSessions.values()) {
            for (WebSocketSession s : sessions) {
                if (!s.equals(exclude)) sendToSession(s, msg);
            }
        }
    }

    private String extractToken(String query) {
        if (query == null) return null;
        for (String param : query.split("&")) {
            String[] kv = param.split("=", 2);
            if (kv.length == 2 && "token".equals(kv[0])) return kv[1];
        }
        return null;
    }
}