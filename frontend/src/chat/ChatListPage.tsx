import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { getMyChats, avatarUrl } from "../api";
import type { Chat } from "../types";
import socket from "./socket";

const ChatListPage: React.FC = () => {
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchChats = useCallback(async () => {
    try {
      const res = await getMyChats();
      setChats(res.data);
    } catch (err) {
      console.error("Failed to load chats:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchChats();
  }, [fetchChats]);

  useEffect(() => {
    if (!socket.connected) socket.connect();

    const onChatUpdated = () => fetchChats();
    socket.on("chat:updated", onChatUpdated);
    return () => {
      socket.off("chat:updated", onChatUpdated);
    };
  }, [fetchChats]);

  if (loading) {
    return <div style={{ padding: "2rem", textAlign: "center" }}>Loading chats...</div>;
  }

  return (
    <div style={{ maxWidth: "700px", margin: "0 auto", padding: "2rem" }}>
      <h2>Messages</h2>

      {chats.length === 0 && (
        <p style={{ color: "#666", textAlign: "center", marginTop: "2rem" }}>
          No conversations yet. Connect with someone to start chatting!
        </p>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        {chats.map((chat) => {
          const picture = avatarUrl(chat.profile_picture);
          return (
          <div
            key={chat.id}
            onClick={() => navigate(`/chats/${chat.id}`)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "1rem",
              padding: "1rem",
              backgroundColor: "#fff",
              border: "1px solid #ddd",
              borderRadius: "8px",
              cursor: "pointer",
              transition: "background-color 0.15s",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.backgroundColor = "#f8f9fa")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.backgroundColor = "#fff")
            }
          >
            {/* Avatar */}
            {picture ? (
              <img
                src={picture}
                alt={chat.first_name}
                style={{
                  width: "50px",
                  height: "50px",
                  borderRadius: "50%",
                  objectFit: "cover",
                  flexShrink: 0,
                }}
              />
            ) : (
              <div
                style={{
                  width: "50px",
                  height: "50px",
                  borderRadius: "50%",
                  backgroundColor: "#e0e0e0",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "1.5rem",
                  flexShrink: 0,
                }}
              >
                👤
              </div>
            )}

            {/* Info */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, marginBottom: "0.2rem" }}>
                {chat.first_name} {chat.last_name}
              </div>
              <div
                style={{
                  color: "#666",
                  fontSize: "0.9rem",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {chat.last_message ?? "No messages yet"}
              </div>
            </div>

            {/* Unread badge + time */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-end",
                gap: "0.3rem",
                flexShrink: 0,
              }}
            >
              {chat.last_message_at && (
                <span style={{ fontSize: "0.75rem", color: "#aaa" }}>
                  {new Date(chat.last_message_at).toLocaleString([], {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              )}
              {chat.unread_count > 0 && (
                <span
                  style={{
                    backgroundColor: "#007bff",
                    color: "#fff",
                    borderRadius: "12px",
                    padding: "0.1rem 0.5rem",
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    minWidth: "20px",
                    textAlign: "center",
                  }}
                >
                  {chat.unread_count}
                </span>
              )}
            </div>
          </div>
          );
        })}
      </div>
    </div>
  );
};

export default ChatListPage;
