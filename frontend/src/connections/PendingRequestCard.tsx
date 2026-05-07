import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { acceptConnection, rejectConnection, avatarUrl } from "../api";

type Props = {
  requestId: string;
  senderFirstName: string;
  senderLastName: string;
  senderProfilePictureUrl: string | null;
  onDone: () => void;
};

export default function PendingRequestCard({
  requestId,
  senderFirstName,
  senderLastName,
  senderProfilePictureUrl,
  onDone,
}: Props) {
  const [loading, setLoading] = useState<"accept" | "reject" | null>(null);
  const navigate = useNavigate();

  const handleAccept = async () => {
    setLoading("accept");
    try {
      await acceptConnection(requestId);
      onDone();
    } catch (err) {
      console.error("Failed to accept request:", err);
    } finally {
      setLoading(null);
    }
  };

  const handleReject = async () => {
    setLoading("reject");
    try {
      await rejectConnection(requestId);
      onDone();
    } catch (err) {
      console.error("Failed to reject request:", err);
    } finally {
      setLoading(null);
    }
  };

  const picture = avatarUrl(senderProfilePictureUrl);

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
          alt={`${senderFirstName} ${senderLastName}`}
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
          {senderFirstName} {senderLastName}
        </p>
        <p style={{ margin: "0", color: "#666", fontSize: "0.9rem" }}>
          wants to connect with you
        </p>
      </div>
      <div style={{ display: "flex", gap: "0.5rem" }}>
        <button
          onClick={() => navigate(`/users/${requestId}`)}
          style={{
            padding: "0.5rem 1rem",
            backgroundColor: "#fff",
            color: "#007bff",
            border: "1px solid #007bff",
            borderRadius: "4px",
            cursor: "pointer",
            fontWeight: "bold",
          }}
        >
          View Profile
        </button>
        <button
          onClick={handleAccept}
          disabled={loading !== null}
          style={{
            padding: "0.5rem 1rem",
            backgroundColor: loading ? "#ccc" : "#28a745",
            color: "#fff",
            border: "none",
            borderRadius: "4px",
            cursor: loading ? "not-allowed" : "pointer",
            fontWeight: "bold",
          }}
        >
          {loading === "accept" ? "..." : "Accept"}
        </button>
        <button
          onClick={handleReject}
          disabled={loading !== null}
          style={{
            padding: "0.5rem 1rem",
            backgroundColor: loading ? "#ccc" : "#dc3545",
            color: "#fff",
            border: "none",
            borderRadius: "4px",
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          {loading === "reject" ? "..." : "Reject"}
        </button>
      </div>
    </div>
  );
}
