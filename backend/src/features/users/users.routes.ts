import { Router } from "express";
import {
  getMe,
  getMyProfileData,
  getMyBioData,
  getPublicUserById,
  getUserProfileById,
  getUserBioById,
} from "./users.controller";
import { authenticate } from "../../middleware/auth.middleware";

const router = Router();

router.get("/me", authenticate, getMe);
router.get("/me/profile", authenticate, getMyProfileData);
router.get("/me/bio", authenticate, getMyBioData);
router.get("/:id", authenticate, getPublicUserById);
router.get("/:id/profile", authenticate, getUserProfileById);
router.get("/:id/bio", authenticate, getUserBioById);

export default router;
