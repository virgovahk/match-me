package com.nexus.features.relationships;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
public class RelationshipService {

    private final JdbcTemplate db;

    public RelationshipService(JdbcTemplate db) {
        this.db = db;
    }

    /**
     * Returns the relationship status between two users.
     * Equivalent of getRelationshipStatus in relationship.service.ts
     * Returns: "connected", "requested", "rejected", or "none"
     */
    public String getRelationshipStatus(UUID viewerId, UUID targetId) {
        List<String> results = db.queryForList(
            """
            SELECT status FROM connections
            WHERE (sender_id = ? AND receiver_id = ?)
               OR (sender_id = ? AND receiver_id = ?)
            """,
            String.class,
            viewerId, targetId, targetId, viewerId
        );
        return results.isEmpty() ? "none" : results.get(0);
    }

    /**
     * Returns IDs of all connected users.
     */
    public List<UUID> getConnectedUserIds(UUID userId) {
        return db.queryForList(
            """
            SELECT CASE WHEN sender_id = ? THEN receiver_id ELSE sender_id END AS other_id
            FROM connections
            WHERE (sender_id = ? OR receiver_id = ?) AND status = 'connected'
            """,
            UUID.class, userId, userId, userId
        );
    }
}