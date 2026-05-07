import { useEffect, useState } from "react";
import { getConnectionRequests } from "../api";
import PendingRequestCard from "./PendingRequestCard";
import type { ConnectionRequest } from "../types";

export default function PendingRequestsPage() {
  const [requests, setRequests] = useState<ConnectionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRequests = async () => {
      try {
        const res = await getConnectionRequests();
        setRequests(res.data || []);
        setError(null);
      } catch (err: any) {
        console.error("Error fetching requests:", err);
        setError(err.response?.data?.message || "Failed to load connection requests");
        setRequests([]);
      } finally {
        setLoading(false);
      }
    };
    fetchRequests();
  }, []);

  const remove = (id: string) => {
    setRequests((prev) => prev.filter((r) => r.id !== id));
  };

  if (loading) {
    return (
      <div style={{ padding: "2rem", textAlign: "center" }}>
        Loading connection requests...
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "800px", margin: "0 auto", padding: "2rem" }}>
      <h2>Connection Requests</h2>
      {error && (
        <div
          style={{
            padding: "1rem",
            backgroundColor: "#f8d7da",
            border: "1px solid #f5c6cb",
            borderRadius: "5px",
            color: "#721c24",
            marginBottom: "1rem",
          }}
        >
          {error}
        </div>
      )}
      {requests.length === 0 && (
        <p style={{ padding: "1rem", textAlign: "center", color: "#666" }}>
          No pending requests
        </p>
      )}

      {requests.map((r) => (
        <PendingRequestCard
          key={r.id}
          requestId={r.id}
          senderFirstName={r.first_name}
          senderLastName={r.last_name}
          senderProfilePictureUrl={r.profile_picture ?? null}
          onDone={() => remove(r.id)}
        />
      ))}
    </div>
  );
}
