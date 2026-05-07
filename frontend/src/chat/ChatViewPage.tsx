import React, { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getChatMessages, getMyChats, getMyProfile, markChatAsRead } from "../api";
import type { Message, Chat } from "../types";
import socket from "./socket";

const TYPING_TIMEOUT_MS = 2000;

const ChatViewPage: React.FC = () => {
  const { chatId } = useParams<{ chatId: string }>();
  const navigate = useNavigate();

  const [messages, setMessages] = useState<Message[]>([]);
  const [chat, setChat] = useState<Chat | null>(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [myUserId, setMyUserId] = useState<string | null>(null);
  const myUserIdRef = React.useRef<string | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);
  const LIMIT = 10;

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    getMyProfile()
      .then((res) => {
        const id = res.data.user_id ?? res.data.id ?? null;
        setMyUserId(id);
        myUserIdRef.current = id;
      })
      .catch(() => {
        setMyUserId(null);
        myUserIdRef.current = null;
      });
  }, []);

  useEffect(() => {
    if (!chatId) return;
    getMyChats()
      .then((res) => {
        const found = res.data.find((c) => c.id === chatId) ?? null;
        setChat(found);
      })
      .catch(console.error);
  }, [chatId]);

  const loadMessages = useCallback(
    async (p: number) => {
      if (!chatId) return;
      try {
        const res = await getChatMessages(chatId, p, LIMIT);
        setMessages(res.data);
      } catch {
        navigate("/chats");
      } finally {
        setLoading(false);
      }
    },
    [chatId, navigate]
  );

  useEffect(() => {
    loadMessages(1);
  }, [loadMessages]);

  useEffect(() => {
    if (!loading) scrollToBottom();
  }, [loading]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (!chatId) return;

    const onMessage = (msg: Message) => {
      setMessages((prev) => {
        const updated = [...prev, msg];
        if (updated.length > LIMIT) {
          return updated.slice(updated.length - LIMIT);
        }
        return updated;
      });
      markChatAsRead(chatId).catch(console.error);
    };

    const onTypingStart = (userId: string) => {
      setTypingUsers((prev) => new Set(prev).add(userId));
    };

    const onTypingStop = (userId: string) => {
      setTypingUsers((prev) => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    };

    const onUserOnline = (userId: string) => {
      setOnlineUsers((prev) => new Set(prev).add(userId));
    };

    const onUserOffline = (userId: string) => {
      setOnlineUsers((prev) => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    };

    const onChatRead = (payload: { chatId: string }) => {
      if (payload.chatId !== chatId) return;
      const me = myUserIdRef.current;
      if (!me) return;
      setMessages((prev) =>
        prev.map((msg) =>
          msg.sender_id === me && !msg.read_at
            ? { ...msg, read_at: new Date().toISOString() }
            : msg
        )
      );
    };

    socket.on("message:new", onMessage);
    socket.on("typing:start", onTypingStart);
    socket.on("typing:stop", onTypingStop);
    socket.on("chat:read", onChatRead);
    socket.on("user:online", onUserOnline);
    socket.on("user:offline", onUserOffline);

    if (!socket.connected) socket.connect();

    socket.emit("chat:join", chatId);

    return () => {
      socket.off("message:new", onMessage);
      socket.off("typing:start", onTypingStart);
      socket.off("typing:stop", onTypingStop);
      socket.off("chat:read", onChatRead);
      socket.off("user:online", onUserOnline);
      socket.off("user:offline", onUserOffline);
    };
  }, [chatId]);

  useEffect(() => {
    if (!chat?.other_user_id) return;
    // Poll briefly until socket is open, then request status
    const id = setInterval(() => {
      if (socket.connected) {
        socket.emit("user:status", chat.other_user_id);
        clearInterval(id);
      }
    }, 200);
    return () => clearInterval(id);
  }, [chat?.other_user_id]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);

    if (!isTypingRef.current) {
      isTypingRef.current = true;
      socket.emit("typing:start", chatId);
    }

    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      isTypingRef.current = false;
      socket.emit("typing:stop", chatId);
    }, TYPING_TIMEOUT_MS);
  };

  const handleSend = () => {
    const content = input.trim();
    if (!content || !chatId) return;

    socket.emit("message:send", { chatId, content });
    setInput("");

    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    if (isTypingRef.current) {
      isTypingRef.current = false;
      socket.emit("typing:stop", chatId);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleSend();
  };

  const isOtherOnline = chat ? onlineUsers.has(chat.other_user_id) : false;

  if (loading) {
    return <div style={{ padding: "2rem", textAlign: "center" }}>Loading chat...</div>;
  }

  return (
    <div
      style={{
        maxWidth: "700px",
        margin: "0 auto",
        padding: "1rem",
        display: "flex",
        flexDirection: "column",
        height: "calc(100vh - 80px)",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.75rem",
          paddingBottom: "1rem",
          borderBottom: "1px solid #ddd",
          marginBottom: "0.5rem",
        }}
      >
        <button
          onClick={() => navigate("/chats")}
          style={{
            background: "none",
            border: "none",
            fontSize: "1.2rem",
            cursor: "pointer",
            padding: "0.25rem 0.5rem",
          }}
        >
          &larr;
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600 }}>
            {chat ? `${chat.first_name} ${chat.last_name}` : "Chat"}
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.35rem",
              fontSize: "0.8rem",
              color: isOtherOnline ? "#28a745" : "#aaa",
            }}
          >
            <span
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                backgroundColor: isOtherOnline ? "#28a745" : "#aaa",
                display: "inline-block",
              }}
            />
            {isOtherOnline ? "Online" : "Offline"}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: "0.5rem",
          paddingRight: "0.25rem",
        }}
      >
        {messages.map((msg) => {
          const isMine = msg.sender_id === myUserId;
          return (
            <div
              key={msg.id}
              style={{
                display: "flex",
                justifyContent: isMine ? "flex-end" : "flex-start",
              }}
            >
              <div
                style={{
                  maxWidth: "70%",
                  padding: "0.6rem 0.9rem",
                  borderRadius: isMine ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                  backgroundColor: isMine ? "#007bff" : "#f0f0f0",
                  color: isMine ? "#fff" : "#333",
                  wordBreak: "break-word",
                }}
              >
                <div>{msg.content}</div>
                <div
                  style={{
                    fontSize: "0.7rem",
                    marginTop: "0.2rem",
                    color: isMine ? "rgba(255,255,255,0.7)" : "#aaa",
                    textAlign: "right",
                    display: "flex",
                    justifyContent: "flex-end",
                    alignItems: "center",
                    gap: "0.35rem",
                  }}
                >
                  {new Date(msg.created_at).toLocaleString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                    month: "short",
                    day: "numeric",
                  })}
                  {isMine && msg.read_at ? "👁" : null}
                </div>
              </div>
            </div>
          );
        })}

        {/* Typing indicator */}
        {typingUsers.size > 0 && (
          <div style={{ display: "flex", justifyContent: "flex-start" }}>
            <div
              style={{
                padding: "0.6rem 1rem",
                backgroundColor: "#f0f0f0",
                borderRadius: "16px 16px 16px 4px",
                color: "#666",
                fontSize: "0.85rem",
                fontStyle: "italic",
              }}
            >
              Typing...
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div
        style={{
          display: "flex",
          gap: "0.5rem",
          paddingTop: "0.75rem",
          borderTop: "1px solid #ddd",
          marginTop: "0.5rem",
        }}
      >
        <input
          type="text"
          value={input}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          style={{
            flex: 1,
            padding: "0.6rem 0.9rem",
            borderRadius: "20px",
            border: "1px solid #ccc",
            fontSize: "1rem",
            outline: "none",
          }}
        />
        <button
          onClick={handleSend}
          disabled={!input.trim()}
          style={{
            padding: "0.6rem 1.2rem",
            borderRadius: "20px",
            border: "none",
            backgroundColor: input.trim() ? "#007bff" : "#ccc",
            color: "#fff",
            fontSize: "1rem",
            cursor: input.trim() ? "pointer" : "default",
            transition: "background-color 0.15s",
          }}
        >
          Send
        </button>
      </div>
    </div>
  );
};

export default ChatViewPage;