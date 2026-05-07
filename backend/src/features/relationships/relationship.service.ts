import { pool } from "../../db/index";

export type RelationshipStatus =
  | "self"
  | "recommended"
  | "requested"
  | "pending"
  | "connected"
  | "none";

export const getRelationshipStatus = async (
  viewerId: string,
  targetUserId: string
): Promise<RelationshipStatus> => {
  if (viewerId === targetUserId) return "self";

  const result = await pool.query(
    `
    SELECT sender_id, receiver_id, status
    FROM connections
    WHERE (sender_id = $1 AND receiver_id = $2)
       OR (sender_id = $2 AND receiver_id = $1)
    LIMIT 1
    `,
    [viewerId, targetUserId]
  );

  if (result.rowCount === 0) return "none";

  const connection = result.rows[0];

  if (connection.status === "connected") return "connected";

  if (connection.sender_id === viewerId && connection.status === "requested")
    return "requested"; 
  if (connection.receiver_id === viewerId && connection.status === "requested")
    return "pending"; 
  return "none";
};
export const getConnectedUserIds = async (userId: string): Promise<string[]> => {
  const result = await pool.query(
    `SELECT 
       CASE 
         WHEN sender_id = $1 THEN receiver_id
         ELSE sender_id
       END AS connected_id
     FROM connections
     WHERE (sender_id = $1 OR receiver_id = $1) AND status = 'connected'`,
    [userId]
  );

  return result.rows.map(row => row.connected_id);
};

