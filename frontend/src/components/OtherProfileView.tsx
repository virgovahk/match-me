import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getUserProfile, avatarUrl } from "../api";
import type { Profile } from "../types";

const OtherProfileView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const res = await getUserProfile(id);
        setProfile(res.data);
      } catch (err: any) {
        console.error("Error fetching profile:", err);
        setError(err.response?.data?.message || "Failed to load profile");
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [id]);

  if (loading) {
    return (
      <div style={{ padding: "2rem", textAlign: "center" }}>
        Loading profile...
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          maxWidth: "600px",
          margin: "0 auto",
          padding: "2rem",
          textAlign: "center",
        }}
      >
        <div
          style={{
            padding: "1rem",
            backgroundColor: "#f8d7da",
            border: "1px solid #f5c6cb",
            borderRadius: "4px",
            color: "#721c24",
            marginBottom: "1rem",
          }}
        >
          {error}
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div style={{ padding: "2rem", textAlign: "center" }}>
        Profile not found.
      </div>
    );
  }

  const formatDate = (value?: string | null) => {
    if (!value) return "";
    const date = new Date(value);
    if (isNaN(date.getTime())) return value;
    return date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div style={{ maxWidth: "600px", margin: "0 auto", padding: "2rem" }}>
      <h1>Profile</h1>

      {avatarUrl(profile.profile_picture) ? (
        <img
          src={avatarUrl(profile.profile_picture)!}
          alt={`${profile.first_name} ${profile.last_name}`}
          style={{
            width: "200px",
            height: "200px",
            borderRadius: "50%",
            marginBottom: "1.5rem",
            objectFit: "cover",
          }}
        />
      ) : (
        <div
          style={{
            width: "200px",
            height: "200px",
            borderRadius: "50%",
            backgroundColor: "#e0e0e0",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "4rem",
            marginBottom: "1.5rem",
          }}
        >
          👤
        </div>
      )}

      <div style={{ marginBottom: "2rem" }}>
        <h2>
          {profile.first_name} {profile.last_name}
        </h2>
        <p style={{ fontSize: "1.1rem", color: "#666" }}>
          {formatDate(profile.birthdate)}
          {profile.gender ? ` • ${profile.gender}` : ""}
          {profile.city ? ` • ${profile.city}` : ""}
        </p>
      </div>

      {profile.bio && (
        <div style={{ marginBottom: "1.5rem" }}>
          <h3>About Me</h3>
          <p>{profile.bio}</p>
        </div>
      )}

      {profile.interests && profile.interests.length > 0 && (
        <div style={{ marginBottom: "1.5rem" }}>
          <h3>Interests</h3>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
            {profile.interests.map((interest) => (
              <span
                key={interest}
                style={{
                  backgroundColor: "#e9ecef",
                  padding: "0.5rem 1rem",
                  borderRadius: "20px",
                }}
              >
                {interest}
              </span>
            ))}
          </div>
        </div>
      )}

      {profile.hobbies && profile.hobbies.length > 0 && (
        <div style={{ marginBottom: "1.5rem" }}>
          <h3>Hobbies</h3>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
            {profile.hobbies.map((hobby) => (
              <span
                key={hobby}
                style={{
                  backgroundColor: "#d4edda",
                  padding: "0.5rem 1rem",
                  borderRadius: "20px",
                }}
              >
                {hobby}
              </span>
            ))}
          </div>
        </div>
      )}

      {profile.music_preferences && profile.music_preferences.length > 0 && (
        <div style={{ marginBottom: "1.5rem" }}>
          <h3>Music Preferences</h3>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
            {profile.music_preferences.map((music) => (
              <span
                key={music}
                style={{
                  backgroundColor: "#fff3cd",
                  padding: "0.5rem 1rem",
                  borderRadius: "20px",
                }}
              >
                {music}
              </span>
            ))}
          </div>
        </div>
      )}

      {profile.food_preferences && profile.food_preferences.length > 0 && (
        <div style={{ marginBottom: "1.5rem" }}>
          <h3>Food Preferences</h3>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
            {profile.food_preferences.map((food) => (
              <span
                key={food}
                style={{
                  backgroundColor: "#d1ecf1",
                  padding: "0.5rem 1rem",
                  borderRadius: "20px",
                }}
              >
                {food}
              </span>
            ))}
          </div>
        </div>
      )}

      {profile.personality_traits && profile.personality_traits.length > 0 && (
        <div style={{ marginBottom: "1.5rem" }}>
          <h3>Personality Traits</h3>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
            {profile.personality_traits.map((trait) => (
              <span
                key={trait}
                style={{
                  backgroundColor: "#f8d7da",
                  padding: "0.5rem 1rem",
                  borderRadius: "20px",
                }}
              >
                {trait}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default OtherProfileView;