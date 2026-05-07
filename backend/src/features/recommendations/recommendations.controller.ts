import { Request, Response } from "express";
import { getTopRecommendations } from "./recommendations.service";
import { pool } from "../../db";

export const getRecommendations = async (req: Request, res: Response) => {
  try {
    const userId = req.userId as string;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const recommendedIds: string[] = await getTopRecommendations(userId);

    return res.json(
      recommendedIds.slice(0, 10).map(id => ({ id }))
    );
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
};

export const dismissRecommendation = async (req: Request, res: Response) => {
  try {
    const userId = req.userId as string;
    const { dismissedUserId } = req.body;

    if (!dismissedUserId) {
      return res.status(400).json({ message: "dismissedUserId required" });
    }

    await pool.query(
      `INSERT INTO dismissed_recommendations (user_id, dismissed_user_id)
       VALUES ($1, $2)
       ON CONFLICT (user_id, dismissed_user_id) DO NOTHING`,
      [userId, dismissedUserId]
    );

    return res.json({ message: "Recommendation dismissed" });
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
};