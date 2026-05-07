import React, { useEffect, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { logoutUser, getMyChats } from "../api";
import socket from "../chat/socket";

type HeaderProps = {
  onLogout: () => void;
};

export const Header: React.FC<HeaderProps> = ({ onLogout }) => {
  const navigate = useNavigate();
  const [totalUnread, setTotalUnread] = useState(0);

  const fetchUnread = async () => {
    try {
      const res = await getMyChats();
      const total = res.data.reduce((sum, c) => sum + c.unread_count, 0);
      setTotalUnread(total);
    } catch {
    }
  };

  useEffect(() => {
    fetchUnread();
  }, []);

  useEffect(() => {
    const onChatUpdated = () => fetchUnread();
    socket.on("chat:updated", onChatUpdated);
    socket.on("chat:read", onChatUpdated);
    return () => {
      socket.off("chat:updated", onChatUpdated);
      socket.off("chat:read", onChatUpdated);
    };
  }, []);

  const handleLogout = async () => {
    try {
      await logoutUser();
    } catch (err) {
      console.error("Error logging out:", err);
    } finally {
      onLogout();
      navigate("/login");
    }
  };

  const linkStyle = ({ isActive }: { isActive: boolean }) => ({
    marginRight: "1rem",
    textDecoration: "none",
    color: isActive ? "#007bff" : "#333",
    fontWeight: isActive ? ("bold" as const) : ("normal" as const),
    position: "relative" as const,
  });

  return (
    <header
      style={{
        display: "flex",
        alignItems: "center",
        padding: "1rem 2rem",
        borderBottom: "1px solid #ddd",
        marginBottom: "2rem",
        flexWrap: "wrap",
        gap: "0.5rem",
      }}
    >
      <NavLink to="/profile" style={linkStyle}>
        Profile
      </NavLink>
      <NavLink to="/edit-profile" style={linkStyle}>
        Edit Profile
      </NavLink>
      <NavLink to="/recommendations" style={linkStyle}>
        Recommendations
      </NavLink>
      <NavLink to="/connections" style={linkStyle}>
        Connections
      </NavLink>
      <NavLink to="/requests" style={linkStyle}>
        Requests
      </NavLink>
      <NavLink to="/chats" style={linkStyle}>
        <span>Chats</span>
        {totalUnread > 0 && (
          <span
            style={{
              position: "absolute",
              top: "-6px",
              right: "-10px",
              backgroundColor: "#dc3545",
              color: "#fff",
              borderRadius: "50%",
              fontSize: "0.65rem",
              fontWeight: 700,
              width: "16px",
              height: "16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {totalUnread > 9 ? "9+" : totalUnread}
          </span>
        )}
      </NavLink>

      <div style={{ marginLeft: "auto" }}>
        <button
          onClick={handleLogout}
          style={{
            padding: "0.3rem 0.8rem",
            backgroundColor: "#dc3545",
            color: "#fff",
            border: "none",
            borderRadius: "0.25rem",
            cursor: "pointer",
          }}
        >
          Logout
        </button>
      </div>
    </header>
  );
};
