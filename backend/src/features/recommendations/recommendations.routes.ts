import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware";
import { ensureProfileComplete } from "../../middleware/profileComplete";
import { getRecommendations, dismissRecommendation } from "./recommendations.controller";

const router = Router();

router.get("/", authenticate, ensureProfileComplete, getRecommendations);
router.post("/dismiss", authenticate, ensureProfileComplete, dismissRecommendation);

export default router;