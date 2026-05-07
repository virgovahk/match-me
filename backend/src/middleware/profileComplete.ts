import { Request, Response, NextFunction } from "express";
import * as profilesService from "../features/profiles/profiles.service";
import { isProfileComplete } from "../features/profiles/profileCompletion";

export const ensureProfileComplete = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.userId as string;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const profile = await profilesService.getProfileByUserId(userId);

    if (!isProfileComplete(profile)) {
      return res.status(403).json({
        message:
          "Your profile is incomplete. Please fill out all required fields before proceeding.",
      });
    }

    next();
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
};
