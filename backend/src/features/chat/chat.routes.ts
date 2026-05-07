import { Router } from "express";
import {
  getMyChats,
  getOrCreateChat,
  getChatMessages,
  markChatAsRead,
} from "./chat.controller";
import { ensureProfileComplete } from "../../middleware/profileComplete";

const router = Router();

router.get("/", ensureProfileComplete, getMyChats);
router.post("/", ensureProfileComplete, getOrCreateChat);
router.get("/:chatId/messages", ensureProfileComplete, getChatMessages);
router.put("/:chatId/read", ensureProfileComplete, markChatAsRead);

export default router;
