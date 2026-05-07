import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getConnections, getUserById, getOrCreateChat, avatarUrl, disconnectUser } from "../api";
import type { UserPublic } from "../types";

const ConnectionsPage: React.FC = () => {
  const [connections, setConnections] = useState<UserPublic[]>([]);
  const [loading, setLoading] = useState(true);
  const [chatLoading, setChatLoading] = useState<string | null>(null);
  const [disconnectLoading, setDisconnectLoading] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchConnections = async () => {
      try {
        const idsRes = await getConnections();
        const ids = idsRes.data;
        const details = await Promise.all(
          ids.map((c) =>
            getUserById(c.id)
              .then((r) => r.data)
              .catch(() => null)
          )
        );
        setConnections(details.filter((u): u is UserPublic => u !== null));
      } catch (err) {
        console.error("Failed to load connections:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchConnections();
  }, []);

  const openChat = async (userId: string) => {
    setChatLoading(userId);
    try {
      const res = await getOrCreateChat(userId);
      navigate(`/chats/${res.data.chatId}`);
    } catch (err: any) {
      console.error("Failed to open chat:", err);
      alert(err.response?.data?.message || "Failed to open chat. Please try again.");
    } finally {
      setChatLoading(null);
    }
  };

  const handleDisconnect = async (userId: string) => {
    setDisconnectLoading(userId);
    try {
      await disconnectUser(userId);
      setConnections(prev => prev.filter(user => user.id !== userId));
    } catch (err) {
      console.error("Failed to disconnect:", err);
      alert("Failed to disconnect from user");
    } finally {
      setDisconnectLoading(null);
    }
  };

  if (loading) {
    return <div style={{ padding: "2rem", textAlign: "center" }}>Loading connections...</div>;
  }

  return (
    <div style={{ maxWidth: "700px", margin: "0 auto", padding: "2rem" }}>
      <h2>My Connections</h2>

      {connections.length === 0 && (
        <p style={{ color: "#666", textAlign: "center", marginTop: "2rem" }}>
          No connections yet. Browse recommendations to connect with people!
        </p>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        {connections.map((user) => {
          const picture = avatarUrl(user.profile_picture);
          return (
            <div
              key={user.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "1rem",
                padding: "1rem",
                border: "1px solid #ddd",
                borderRadius: "8px",
                backgroundColor: "#fff",
              }}
            >
              {picture ? (
                <img
                  src={picture}
                  alt={user.first_name}
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

              <div style={{ flex: 1, fontWeight: 500 }}>
                {user.first_name} {user.last_name}
              </div>

              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button
                  onClick={() => navigate(`/users/${user.id}`)}
                  style={{
                    padding: "0.4rem 1rem",
                    borderRadius: "6px",
                    border: "1px solid #007bff",
                    backgroundColor: "#fff",
                    color: "#007bff",
                    cursor: "pointer",
                    fontSize: "0.9rem",
                  }}
                >
                  View Profile
                </button>
                <button
                  onClick={() => openChat(user.id)}
                  disabled={chatLoading === user.id}
                  style={{
                    padding: "0.4rem 1rem",
                    borderRadius: "6px",
                    border: "none",
                    backgroundColor: chatLoading === user.id ? "#ccc" : "#007bff",
                    color: "#fff",
                    cursor: chatLoading === user.id ? "not-allowed" : "pointer",
                    fontSize: "0.9rem",
                  }}
                >
                  {chatLoading === user.id ? "Opening..." : "Message"}
                </button>
                <button
                  onClick={() => handleDisconnect(user.id)}
                  disabled={disconnectLoading === user.id}
                  style={{
                    padding: "0.4rem 1rem",
                    borderRadius: "6px",
                    border: "none",
                    backgroundColor: disconnectLoading === user.id ? "#ccc" : "#dc3545",
                    color: "#fff",
                    cursor: disconnectLoading === user.id ? "not-allowed" : "pointer",
                    fontSize: "0.9rem",
                  }}
                >
                  {disconnectLoading === user.id ? "Disconnecting..." : "Disconnect"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ConnectionsPage;
