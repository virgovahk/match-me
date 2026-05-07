import { Request, Response } from "express";
import { pool } from "../../db";
import * as profilesService from "./profiles.service";

// email is protected — it lives on the users table, not profiles.
// Including it here ensures it is never written to the profiles table
// even if the frontend accidentally sends it in an update payload.
const PROTECTED_FIELDS = ["id", "user_id", "created_at", "updated_at", "email"];

import { getRelationshipStatus } from "../relationships/relationship.service";
import { canViewProfile } from "./profiles.permissions";
import { Profile } from "./profiles.types";
import { getTopRecommendations } from "../recommendations/recommendations.service";

export const createProfile = async (req: Request, res: Response) => {
  try {
    const userId = req.userId as string;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const profilePicture = req.file
      ? `/uploads/${req.file.filename}`
      : req.body.profile_picture;

    const {
      first_name,
      last_name,
      birthdate,
      gender,
      bio,
      city,
      latitude,
      longitude,
    } = req.body;

    // Clean 'null' strings to null values
    const cleanValue = (val: any) => val === 'null' ? null : val;

    const profile: Profile = await profilesService.createProfile({
      user_id: userId,
      first_name: cleanValue(first_name),
      last_name: cleanValue(last_name),
      birthdate: cleanValue(birthdate),
      gender: cleanValue(gender),
      bio: cleanValue(bio),
      city: cleanValue(city),
      latitude: cleanValue(latitude),
      longitude: cleanValue(longitude),
      profile_picture: profilePicture,
    });

    return res.status(201).json(profile);
  } catch (err: any) {
    return res.status(400).json({ message: err.message });
  }
};

export const getMyProfile = async (req: Request, res: Response) => {
  try {
    const userId = req.userId as string;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const profile = await profilesService.getRawProfileByUserId(userId);

    // Fetch email from users table and attach it — only for the profile owner
    const userResult = await pool.query(
      `SELECT email FROM users WHERE id = $1`,
      [userId]
    );
    const email = userResult.rows[0]?.email;

    return res.json({ ...profile, email });
  } catch (err: any) {
    return res.status(404).json({ message: err.message });
  }
};

export const updateMyProfile = async (req: Request, res: Response) => {
  try {
    const userId = req.userId as string;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Strip fields that must not be overwritten, including email —
    // email is on the users table and must never be written to profiles
    const updates = Object.fromEntries(
      Object.entries(req.body).filter(([key]) => !PROTECTED_FIELDS.includes(key))
    );

    // Clean 'null' strings to null values
    const cleanUpdates = Object.fromEntries(
      Object.entries(updates).map(([key, val]) => [key, val === 'null' ? null : val])
    );

    console.log("[profiles.controller] updateMyProfile payload", cleanUpdates);
    console.log(
      "[profiles.controller] updateMyProfile JSON",
      JSON.stringify(cleanUpdates)
    );
    console.log(
      "[profiles.controller] types",
      Object.fromEntries(Object.entries(cleanUpdates).map(([k, v]) => [k, typeof v]))
    );

    await profilesService.updateProfileByUserId(userId, cleanUpdates);
    const updated = await profilesService.getRawProfileByUserId(userId);
    return res.json(updated);
  } catch (err: any) {
    return res.status(400).json({ message: err.message });
  }
};

export const uploadProfilePicture = async (req: Request, res: Response) => {
  try {
    const userId = req.userId as string;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    console.log("[uploadProfilePicture] content-type", req.headers["content-type"]);
    console.log("[uploadProfilePicture] req.file", req.file);
    console.log("[uploadProfilePicture] req.files", (req as any).files);

    const uploadedFile = req.file || ((req as any).files?.[0] as Express.Multer.File);

    if (!uploadedFile) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const fileUrl = `/uploads/${uploadedFile.filename}`;

    const updatedProfile: Profile =
      await profilesService.updateProfileByUserId(userId, {
        profile_picture: fileUrl,
      });

    return res.json({
      url: fileUrl,
      profile: updatedProfile,
    });
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
};

export const getProfileByUserId = async (req: Request, res: Response) => {
  try {
    const viewerId = req.userId as string;
    const targetUserId = String(req.params.userId);

    if (!viewerId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!targetUserId) {
      return res.status(400).json({ message: "Target user ID required" });
    }

    const relationshipStatus = await getRelationshipStatus(
      viewerId,
      targetUserId
    );

    if (!canViewProfile(relationshipStatus)) {
      const recommendedIds = await getTopRecommendations(viewerId);
      if (!recommendedIds.includes(targetUserId)) {
        return res.status(404).json({ message: "User not found" });
      }
    }

    const profile = await profilesService.getRawProfileByUserId(targetUserId);

    const { email: _email, ...safeProfile } = profile;

    return res.json(safeProfile);
  } catch (err: any) {
    return res.status(404).json({ message: err.message });
  }
};