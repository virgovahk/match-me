import { Request, Response } from "express";
import * as usersService from "./users.service";
import { getRelationshipStatus } from "../relationships/relationship.service";
import { canViewProfile } from "../profiles/profiles.permissions";
import { getTopRecommendations } from "../recommendations/recommendations.service";

async function hasAccess(viewerId: string, targetId: string): Promise<boolean> {
  if (viewerId === targetId) return true;
  const status = await getRelationshipStatus(viewerId, targetId);
  if (canViewProfile(status)) return true;
  const recs = await getTopRecommendations(viewerId);
  return recs.includes(targetId);
}

export const getMe = async (req: Request, res: Response) => {
  try {
    const user = await usersService.getPublicUser(req.userId!);
    return res.json(user);
  } catch {
    return res.status(404).json({ message: "User not found" });
  }
};

export const getMyProfileData = async (req: Request, res: Response) => {
  try {
    const data = await usersService.getUserProfileData(req.userId!);
    return res.json(data);
  } catch {
    return res.status(404).json({ message: "User not found" });
  }
};

export const getMyBioData = async (req: Request, res: Response) => {
  try {
    const data = await usersService.getUserBioData(req.userId!);
    return res.json(data);
  } catch {
    return res.status(404).json({ message: "User not found" });
  }
};

export const getPublicUserById = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    if (!await hasAccess(req.userId!, id)) return res.status(404).json({ message: "User not found" });
    const user = await usersService.getPublicUser(id);
    return res.json(user);
  } catch {
    return res.status(404).json({ message: "User not found" });
  }
};

export const getUserProfileById = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    if (!await hasAccess(req.userId!, id)) return res.status(404).json({ message: "User not found" });
    const data = await usersService.getUserProfileData(id);
    return res.json(data);
  } catch {
    return res.status(404).json({ message: "User not found" });
  }
};

export const getUserBioById = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    if (!await hasAccess(req.userId!, id)) return res.status(404).json({ message: "User not found" });
    const data = await usersService.getUserBioData(id);
    return res.json(data);
  } catch {
    return res.status(404).json({ message: "User not found" });
  }
};
