import { Request, Response } from "express";
import { pool } from "../../db";
import { getConnectedUserIds } from "../relationships/relationship.service";
import { isProfileComplete } from "../profiles/profileCompletion";
import { mapProfileDataToProfile } from "../profiles/profiles.service";

export const getConnections = async (req: Request, res: Response) => {
  try {
    const userId = req.userId as string;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const connectedIds: string[] = await getConnectedUserIds(userId);

    const profilesResult = await pool.query(
      `SELECT * FROM profiles WHERE user_id = ANY($1::uuid[])`,
      [connectedIds]
    );
    const profiles = profilesResult.rows.map(mapProfileDataToProfile);

    const completeProfiles = profiles
      .filter(isProfileComplete)
      .map(p => ({ id: p.userId }));

    return res.json(completeProfiles);
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
};

export const sendConnectionRequest = async (req: Request, res: Response) => {
  try {
    const senderId = req.userId as string;
    const receiverId = req.body.receiverId as string;

    if (!senderId || !receiverId) {
      return res.status(400).json({ message: "Missing sender or receiver ID" });
    }

    const existing = await pool.query(
      `SELECT * FROM connections
       WHERE (sender_id = $1 AND receiver_id = $2)
          OR (sender_id = $2 AND receiver_id = $1)`,
      [senderId, receiverId]
    );

    if ((existing?.rowCount ?? 0) > 0) {
      return res.status(400).json({ message: "Connection already exists or pending" });
    }

    await pool.query(
      `INSERT INTO connections (sender_id, receiver_id, status)
       VALUES ($1, $2, 'requested')`,
      [senderId, receiverId]
    );

    return res.json({ message: "Connection request sent" });
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
};

export const acceptConnectionRequest = async (req: Request, res: Response) => {
  try {
    const receiverId = req.userId as string;
    const senderId = req.body.senderId as string;

    if (!receiverId || !senderId) {
      return res.status(400).json({ message: "Missing sender or receiver ID" });
    }

    const result = await pool.query(
      `UPDATE connections
       SET status = 'connected'
       WHERE sender_id = $1 AND receiver_id = $2 AND status = 'requested'`,
      [senderId, receiverId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "No pending request found" });
    }

    return res.json({ message: "Connection request accepted" });
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
};

export const rejectConnectionRequest = async (req: Request, res: Response) => {
  try {
    const receiverId = req.userId as string;
    const { senderId } = req.body;

    if (!senderId) {
      return res.status(400).json({ message: "senderId required" });
    }

    const result = await pool.query(
      `UPDATE connections
       SET status = 'rejected'
       WHERE sender_id = $1 AND receiver_id = $2 AND status = 'requested'`,
      [senderId, receiverId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "No pending request found" });
    }

    return res.json({ message: "Connection request rejected" });
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
};

export const removeConnection = async (req: Request, res: Response) => {
  try {
    const userId = req.userId as string;
    const { otherUserId } = req.body;

    if (!otherUserId) {
      return res.status(400).json({ message: "otherUserId required" });
    }

    const result = await pool.query(
      `DELETE FROM connections
       WHERE ((sender_id = $1 AND receiver_id = $2) OR (sender_id = $2 AND receiver_id = $1))
         AND status = 'connected'`,
      [userId, otherUserId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Connection not found" });
    }

    return res.json({ message: "Connection removed" });
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
};

export const disconnectUser = async (req: Request, res: Response) => {
  try {
    const currentUserId = req.userId as string;
    const { userId: otherUserId } = req.body;

    if (!otherUserId) {
      return res.status(400).json({ message: "userId required" });
    }

    const connectionResult = await pool.query(
      `DELETE FROM connections
       WHERE ((sender_id = $1 AND receiver_id = $2)
          OR  (sender_id = $2 AND receiver_id = $1))
         AND status = 'connected'`,
      [currentUserId, otherUserId]
    );

    if (connectionResult.rowCount === 0) {
      return res.status(404).json({ message: "Connection not found" });
    }

    const [user1, user2] = currentUserId < otherUserId ? [currentUserId, otherUserId] : [otherUserId, currentUserId];
    await pool.query(
      `DELETE FROM chats WHERE user1_id = $1 AND user2_id = $2`,
      [user1, user2]
    );

    return res.json({ message: "Disconnected successfully" });
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
};

export const getPendingRequests = async (req: Request, res: Response) => {
  try {
    const userId = req.userId as string;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const result = await pool.query(
      `SELECT p.user_id AS id, p.first_name, p.last_name, p.profile_picture
       FROM connections c
       JOIN profiles p ON p.user_id = c.sender_id
       WHERE c.receiver_id = $1 AND c.status = 'requested'`,
      [userId]
    );

    return res.json(result.rows);
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
};
