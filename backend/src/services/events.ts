import { Server, Socket } from "socket.io";
import {
  saveMessage,
  isChatParticipant,
  getOtherParticipantId,
  markChatAsRead,
} from "../features/chat/chat.service";

const onlineUsers = new Map<string, Set<string>>();
let ioServer: Server | null = null;

export function isUserOnline(userId: string): boolean {
  return (onlineUsers.get(userId)?.size ?? 0) > 0;
}

export async function notifyChatRead(chatId: string, readerId: string) {
  if (!ioServer) return;
  const otherId = await getOtherParticipantId(chatId, readerId);
  if (otherId) {
    ioServer.to(`user_${otherId}`).emit("chat:read", { chatId });
  }
}

export function socketEvents(io: Server) {
  ioServer = io;

  io.on("connection", (socket: Socket) => {
    const userId = socket.data.userId as string;
    console.log(`Socket connected: ${userId}`);

    socket.join(`user_${userId}`);

    if (!onlineUsers.has(userId)) onlineUsers.set(userId, new Set());
    onlineUsers.get(userId)!.add(socket.id);

    const alreadyOnlineUserIds = Array.from(onlineUsers.keys());
    alreadyOnlineUserIds.forEach((onlineUserId) => {
      socket.emit("user:online", onlineUserId);
    });

    socket.broadcast.emit("user:online", userId);

    socket.on("user:status", (targetUserId: string) => {
      const online = isUserOnline(targetUserId);
      socket.emit(online ? "user:online" : "user:offline", targetUserId);
    });

    socket.on("chat:join", async (chatId: string) => {
      const chat = await isChatParticipant(chatId, userId);
      if (!chat) return;
      socket.join(`chat_${chatId}`);
      await markChatAsRead(chatId, userId);
      await notifyChatRead(chatId, userId);
    });

    socket.on("message:send", async (payload: { chatId: string; content: string }) => {
      const { chatId, content } = payload;
      if (!content?.trim()) return;

      const chat = await isChatParticipant(chatId, userId);
      if (!chat) return;

      try {
        const savedMessage = await saveMessage(chatId, userId, content.trim());
        io.to(`chat_${chatId}`).emit("message:new", savedMessage);

        const otherId = await getOtherParticipantId(chatId, userId);
        if (otherId) {
          io.to(`user_${otherId}`).emit("chat:updated", { chatId });
        }
      } catch (err) {
        console.error("Failed to save message:", err);
      }
    });

    socket.on("typing:start", (chatId: string) => {
      socket.to(`chat_${chatId}`).emit("typing:start", userId);
    });

    socket.on("typing:stop", (chatId: string) => {
      socket.to(`chat_${chatId}`).emit("typing:stop", userId);
    });

    socket.on("disconnect", () => {
      console.log(`Socket disconnected: ${userId}`);
      const userSockets = onlineUsers.get(userId);
      if (userSockets) {
        userSockets.delete(socket.id);
        if (userSockets.size === 0) {
          onlineUsers.delete(userId);
          socket.broadcast.emit("user:offline", userId);
        }
      }
    });
  });
}