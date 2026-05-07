import { pool } from "../../db/index";

export const sendConnectionRequest = async (
  senderId: string,
  receiverId: string
) => {
  const result = await pool.query(
    `INSERT INTO connections (sender_id, receiver_id, status)
     VALUES ($1, $2, 'requested')
     ON CONFLICT (sender_id, receiver_id) DO NOTHING
     RETURNING *`,
    [senderId, receiverId]
  );
  return result.rows[0];
};

export const acceptConnectionRequest = async (
  senderId: string,
  receiverId: string
) => {
  const result = await pool.query(
    `UPDATE connections
     SET status = 'connected'
     WHERE sender_id = $1 AND receiver_id = $2 AND status = 'requested'
     RETURNING *`,
    [senderId, receiverId]
  );
  return result.rows[0];
};

export const getPendingRequests = async (userId: string) => {
  const result = await pool.query(
    `SELECT sender_id
     FROM connections
     WHERE receiver_id = $1 AND status = 'requested'`,
    [userId]
  );
  return result.rows.map((row) => row.sender_id);
};
