import { useEffect, useState } from "react";
import { getRecommendations, getUserById } from "../api";
import RecommendationCard from "./RecommendationCard";
import type { UserPublic } from "../types";

export default function RecommendationsPage() {
  const [recs, setRecs] = useState<UserPublic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRecs = async () => {
      try {
        setLoading(true);
        const idRes = await getRecommendations();
        const userIds = idRes.data || [];

        const users = await Promise.all(
          userIds.map((rec: { id: string }) =>
            getUserById(rec.id)
              .then((res) => res.data)
              .catch((err) => {
                console.error(`Failed to fetch user ${rec.id}:`, err);
                return null;
              })
          )
        );

        setRecs(users.filter((u) => u !== null));
        setError(null);
      } catch (err: any) {
        console.error("Error fetching recommendations:", err);
        setError(
          err.response?.data?.message || "Failed to load recommendations"
        );
        setRecs([]);
      } finally {
        setLoading(false);
      }
    };
    fetchRecs();
  }, []);

  const removeFromList = (id: string) => {
    setRecs((prev) => prev.filter((r) => r.id !== id));
  };

  if (loading) {
    return (
      <div style={{ padding: "2rem", textAlign: "center" }}>
        Loading recommendations...
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "800px", margin: "0 auto", padding: "2rem" }}>
      <h2>Recommended for you</h2>
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
      {recs.length === 0 && (
        <p style={{ padding: "1rem", textAlign: "center", color: "#666" }}>
          No recommendations available at the moment. Check back later!
        </p>
      )}

      {recs.map((user) => (
        <RecommendationCard
          key={user.id}
          userId={user.id}
          firstName={user.first_name}
          lastName={user.last_name}
          profilePictureUrl={user.profile_picture || null}
          onDone={() => removeFromList(user.id)}
        />
      ))}
    </div>
  );
}
