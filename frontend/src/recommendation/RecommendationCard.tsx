import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { requestConnection, dismissRecommendation, avatarUrl } from "../api";

type Props = {
  userId: string;
  firstName: string;
  lastName: string;
  profilePictureUrl: string | null;
  onDone: () => void;
};

export default function RecommendationCard({
  userId,
  firstName,
  lastName,
  profilePictureUrl,
  onDone,
}: Props) {
  const [loading, setLoading] = useState<"connect" | "dismiss" | null>(null);
  const navigate = useNavigate();

  const handleConnect = async () => {
    setLoading("connect");
    try {
      await requestConnection(userId);
      onDone();
    } catch (err) {
      console.error("Failed to connect:", err);
    } finally {
      setLoading(null);
    }
  };

  const handleDismiss = async () => {
    setLoading("dismiss");
    try {
      await dismissRecommendation(userId);
    } catch (err) {
      console.error("Failed to dismiss:", err);
    } finally {
      setLoading(null);
      onDone();
    }
  };

  const picture = avatarUrl(profilePictureUrl);

  return (
    <div
      style={{
        border: "1px solid #ddd",
        borderRadius: "8px",
        padding: "1rem",
        marginBottom: "1rem",
        display: "flex",
        alignItems: "center",
        gap: "1rem",
        backgroundColor: "#fff",
        boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
      }}
    >
      {picture ? (
        <img
          src={picture}
          alt={`${firstName} ${lastName}`}
          style={{
            width: "80px",
            height: "80px",
            borderRadius: "50%",
            objectFit: "cover",
            flexShrink: 0,
          }}
        />
      ) : (
        <div
          style={{
            width: "80px",
            height: "80px",
            borderRadius: "50%",
            backgroundColor: "#e0e0e0",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "2rem",
            flexShrink: 0,
          }}
        >
          👤
        </div>
      )}
      <div style={{ flex: 1 }}>
        <p
          style={{
            margin: "0 0 0.5rem 0",
            fontWeight: "bold",
            fontSize: "1.1rem",
          }}
        >
          {firstName} {lastName}
        </p>
      </div>
      <div style={{ display: "flex", gap: "0.5rem" }}>
        <button
          onClick={() => navigate(`/users/${userId}`)}
          style={{
            padding: "0.5rem 1rem",
            backgroundColor: "#28a745",
            color: "#fff",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            fontWeight: "bold",
          }}
        >
          View Profile
        </button>
        <button
          onClick={handleConnect}
          disabled={loading !== null}
          style={{
            padding: "0.5rem 1rem",
            backgroundColor: loading ? "#ccc" : "#007bff",
            color: "#fff",
            border: "none",
            borderRadius: "4px",
            cursor: loading ? "not-allowed" : "pointer",
            fontWeight: "bold",
          }}
        >
          {loading === "connect" ? "..." : "Connect"}
        </button>
        <button
          onClick={handleDismiss}
          disabled={loading !== null}
          style={{
            padding: "0.5rem 1rem",
            backgroundColor: loading ? "#ccc" : "#6c757d",
            color: "#fff",
            border: "none",
            borderRadius: "4px",
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          {loading === "dismiss" ? "..." : "Dismiss"}
        </button>
      </div>
    </div>
  );
}
