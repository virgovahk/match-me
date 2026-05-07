import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../config/env";

export const authenticate = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const token = (req as any).cookies?.token;

  if (!token) {
    console.log("❌ No token in cookie");
    return res.status(401).json({ message: "Not authenticated. Please login." });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET) as { userId: string };
    console.log("✅ Token verified for userId:", payload.userId);
    (req as any).userId = payload.userId;
    next();
  } catch (err) {
    console.error("❌ Token verification failed:", err);
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};
  