import axios from "axios";
import type {
  Profile,
  UserPublic,
  Connection,
  ConnectionRequest,
  Chat,
  Message,
} from "./types";

export const API_URL = (import.meta.env.VITE_API_URL as string) || "http://localhost:3000";

export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
});

export function avatarUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (path.startsWith("http") || path.startsWith("data:") || path.startsWith("blob:")) {
    return path;
  }

  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_URL}${normalizedPath}`;
}

export const registerUser = (email: string, password: string) =>
  api.post<{ message: string }>("/auth/register", { email, password });

export const loginUser = (email: string, password: string) =>
  api.post<{ message: string }>("/auth/login", { email, password });

export const logoutUser = () => api.post("/auth/logout");

export const getMyProfile = () => api.get<Profile>("/profiles/me");

export const updateMyProfile = (data: Partial<Profile>) =>
  api.put<Profile>("/profiles/me", data);

export const createProfile = (data: Partial<Profile>) =>
  api.post<Profile>("/profiles", data);

export const uploadProfilePicture = (file: File) => {
  const formData = new FormData();
  formData.append("profile_picture", file);
  return api.post<{ url: string }>("/profiles/me/picture", formData);
};

export const getUserById = (userId: string) =>
  api.get<UserPublic>(`/users/${userId}`);

export const getConnectionRequests = () =>
  api.get<ConnectionRequest[]>("/connections/pending");

export const acceptConnection = (senderId: string) =>
  api.post("/connections/accept", { senderId });

export const rejectConnection = (senderId: string) =>
  api.post("/connections/reject", { senderId });

export const dismissRecommendation = (dismissedUserId: string) =>
  api.post("/recommendations/dismiss", { dismissedUserId });

export const requestConnection = (receiverId: string) =>
  api.post("/connections/request", { receiverId });

export const getConnections = () =>
  api.get<Connection[]>("/connections");

export const disconnectUser = (userId: string) =>
  api.post("/connections/disconnect", { userId });

export const getRecommendations = () =>
  api.get<Array<{ id: string }>>("recommendations");

export const getMyChats = () => api.get<Chat[]>("/chats");

export const getOrCreateChat = (otherUserId: string) =>
  api.post<{ chatId: string }>("/chats", { otherUserId });

export const getChatMessages = (chatId: string, page?: number, limit?: number) =>
  api.get<Message[]>(`/chats/${chatId}/messages`, { params: { page, limit } });

export const getUserProfile = (userId: string) =>
  api.get<Profile>(`/profiles/${userId}`);

export const markChatAsRead = (chatId: string) =>
  api.put(`/chats/${chatId}/read`);
