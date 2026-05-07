import { Router } from "express";
import { getMe, getMyProfileData, getMyBioData } from "./users.controller";

const router = Router();

router.get("/", getMe);
router.get("/profile", getMyProfileData);
router.get("/bio", getMyBioData);

export default router;
