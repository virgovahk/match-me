import { Request, Response } from "express";
import * as chatService from "./chat.service";
import { notifyChatRead } from "../../services/events";

export const getMyChats = async (req: Request, res: Response) => {
  try {
    const userId = req.userId as string;
    const chats = await chatService.getMyChats(userId);
    return res.json(chats);
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
};

export const getOrCreateChat = async (req: Request, res: Response) => {
  try {
    const userId = req.userId as string;
    const { otherUserId } = req.body;
    if (!otherUserId) return res.status(400).json({ message: "otherUserId required" });

    const chat = await chatService.getOrCreateChat(userId, otherUserId);
    return res.json({ chatId: chat.id });
  } catch (err: any) {
    if (err.message === "Users are not connected") {
      return res.status(403).json({ message: err.message });
    }
    return res.status(500).json({ message: err.message });
  }
};

export const getChatMessages = async (req: Request, res: Response) => {
  try {
    const userId = req.userId as string;
    const chatId = req.params.chatId as string;
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string) || 10));

    const messages = await chatService.getChatMessages(chatId, userId, page, limit);
    if (messages === null) return res.status(404).json({ message: "Chat not found" });

    return res.json(messages);
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
};

export const markChatAsRead = async (req: Request, res: Response) => {
  try {
    const userId = req.userId as string;
    const chatId = req.params.chatId as string;
    await chatService.markChatAsRead(chatId, userId);
    await notifyChatRead(chatId, userId);
    return res.json({ message: "Marked as read" });
  } catch (err: any) {
    return res.status(500).json({ message: err.message });
  }
};
