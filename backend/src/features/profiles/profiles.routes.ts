import { Router } from "express";
import {
  createProfile,
  getMyProfile,
  updateMyProfile,
  uploadProfilePicture,
  getProfileByUserId,
} from "./profiles.controller";
import { authenticate } from "../../middleware/auth.middleware";
import { ensureProfileComplete } from "../../middleware/profileComplete";
import { upload } from "../../middleware/upload.middleware";

const router = Router();


router.post(
  "/",
  authenticate,
  upload.single("profile_picture"),
  createProfile
);
router.put(
  "/me",
  authenticate,
  upload.single("profile_picture"),
  updateMyProfile
);
router.get("/me", authenticate, getMyProfile);
router.post(
  "/me/picture",
  authenticate,
  upload.any(),
  uploadProfilePicture
);
router.get("/:userId", authenticate, getProfileByUserId);


export default router;
