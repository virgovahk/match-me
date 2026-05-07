import { pool } from "../../db/index";

function orderedPair(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

export const getOrCreateChat = async (userId: string, otherUserId: string) => {
  const connected = await pool.query(
    `SELECT 1 FROM connections
     WHERE ((sender_id = $1 AND receiver_id = $2) OR (sender_id = $2 AND receiver_id = $1))
       AND status = 'connected'`,
    [userId, otherUserId]
  );
  if (connected.rows.length === 0) {
    throw new Error("Users are not connected");
  }

  const [user1, user2] = orderedPair(userId, otherUserId);
  const { rows } = await pool.query(
    `INSERT INTO chats (user1_id, user2_id)
     VALUES ($1, $2)
     ON CONFLICT (user1_id, user2_id) DO UPDATE SET updated_at = NOW()
     RETURNING id`,
    [user1, user2]
  );
  return rows[0];
};

export const getMyChats = async (userId: string) => {
  const { rows } = await pool.query(
    `SELECT
       c.id,
       c.updated_at,
       CASE WHEN c.user1_id = $1 THEN c.user2_id ELSE c.user1_id END AS other_user_id,
       p.first_name,
       p.last_name,
       p.profile_picture,
       (SELECT content FROM messages WHERE chat_id = c.id ORDER BY created_at DESC LIMIT 1) AS last_message,
       (SELECT created_at FROM messages WHERE chat_id = c.id ORDER BY created_at DESC LIMIT 1) AS last_message_at,
       (SELECT COUNT(*)::int FROM messages WHERE chat_id = c.id AND sender_id != $1 AND read_at IS NULL) AS unread_count
     FROM chats c
     JOIN profiles p ON p.user_id = CASE WHEN c.user1_id = $1 THEN c.user2_id ELSE c.user1_id END
     WHERE c.user1_id = $1 OR c.user2_id = $1
     ORDER BY c.updated_at DESC`,
    [userId]
  );
  return rows;
};

export const isChatParticipant = async (chatId: string, userId: string) => {
  const { rows } = await pool.query(
    `SELECT user1_id, user2_id FROM chats WHERE id = $1 AND (user1_id = $2 OR user2_id = $2)`,
    [chatId, userId]
  );
  return rows.length > 0 ? rows[0] : null;
};

export const getOtherParticipantId = async (chatId: string, userId: string): Promise<string | null> => {
  const { rows } = await pool.query(
    `SELECT CASE WHEN user1_id = $2 THEN user2_id ELSE user1_id END AS other_user_id
     FROM chats WHERE id = $1 AND (user1_id = $2 OR user2_id = $2)`,
    [chatId, userId]
  );
  return rows[0]?.other_user_id ?? null;
};

export const getChatMessages = async (
  chatId: string,
  userId: string,
  page: number,
  limit: number
) => {
  const participant = await isChatParticipant(chatId, userId);
  if (!participant) return null;

  const offset = (page - 1) * limit;
  const { rows } = await pool.query(
    `SELECT id, chat_id, sender_id, content, created_at, read_at
     FROM messages
     WHERE chat_id = $1
     ORDER BY created_at DESC
     LIMIT $2 OFFSET $3`,
    [chatId, limit, offset]
  );
  return rows.reverse();
};

export const saveMessage = async (chatId: string, senderId: string, content: string) => {
  const { rows } = await pool.query(
    `INSERT INTO messages (chat_id, sender_id, content) VALUES ($1, $2, $3) RETURNING *`,
    [chatId, senderId, content]
  );

  await pool.query(
    `DELETE FROM messages
     WHERE id IN (
       SELECT id FROM messages
       WHERE chat_id = $1
       ORDER BY created_at DESC
       OFFSET 10
     )`,
    [chatId]
  );

  await pool.query(`UPDATE chats SET updated_at = NOW() WHERE id = $1`, [chatId]);
  return rows[0];
};

export const markChatAsRead = async (chatId: string, userId: string) => {
  await pool.query(
    `UPDATE messages SET read_at = NOW()
     WHERE chat_id = $1 AND sender_id != $2 AND read_at IS NULL`,
    [chatId, userId]
  );
};
