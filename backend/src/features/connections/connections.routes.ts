import { Router } from "express";
import {
  sendConnectionRequest,
  acceptConnectionRequest,
  rejectConnectionRequest,
  disconnectUser,
  getPendingRequests,
  getConnections,
} from "./connections.controller";
import { authenticate } from "../../middleware/auth.middleware";
import { ensureProfileComplete } from "../../middleware/profileComplete";

const router = Router();

router.post("/request", authenticate, ensureProfileComplete, sendConnectionRequest);
router.post("/accept", authenticate, ensureProfileComplete, acceptConnectionRequest);
router.post("/reject", authenticate, ensureProfileComplete, rejectConnectionRequest);
router.post("/disconnect", authenticate, ensureProfileComplete, disconnectUser);
router.get("/pending", authenticate, getPendingRequests);
router.get("/", authenticate, getConnections);

export default router;
