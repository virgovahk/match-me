import React, { useState, useEffect, useCallback, useRef } from "react";
import type { ChangeEvent } from "react";
import { useNavigate } from "react-router-dom";
import {
  getMyProfile,
  updateMyProfile,
  createProfile,
  uploadProfilePicture,
  avatarUrl,
} from "../api";
import type { Profile } from "../types";

interface Props {
  onProfileCreated?: () => void;
}

type ErrorMap = Record<string, string>;

// ── Validation ────────────────────────────────────────────────────────────────

function validate(p: Partial<Profile>): ErrorMap {
  const errs: ErrorMap = {};
  if (!p.first_name?.trim())  errs.first_name        = "First name is required";
  if (!p.last_name?.trim())   errs.last_name         = "Last name is required";
  if (!p.birthdate)           errs.birthdate         = "Birthdate is required";
  if (!p.gender)              errs.gender            = "Gender is required";
  if (!p.bio?.trim())         errs.bio               = "Bio is required";
  if (!p.city?.trim())        errs.city              = "City is required";

  const hasItems = (arr?: string[]) => (arr || []).some((s) => s.trim() !== "");
  if (!hasItems(p.interests as string[]))         errs.interests         = "Please add at least one interest";
  if (!hasItems(p.hobbies as string[]))           errs.hobbies           = "Please add at least one hobby";
  if (!hasItems(p.music_preferences as string[])) errs.music_preferences = "Please add at least one music preference";
  if (!hasItems(p.food_preferences as string[]))  errs.food_preferences  = "Please add at least one food preference";
  if (!hasItems(p.personality_traits as string[]))errs.personality_traits= "Please add at least one personality trait";
  return errs;
}

// ── Reusable sub-components ───────────────────────────────────────────────────

const FieldError: React.FC<{ message?: string }> = ({ message }) =>
  message ? (
    <p
      data-field-error
      style={{ color: "#dc3545", fontSize: "0.8rem", margin: "0.25rem 0 0" }}
    >
      {message}
    </p>
  ) : null;

const Asterisk = () => <span style={{ color: "#dc3545", marginLeft: "0.2rem" }}>*</span>;

const ArrayField: React.FC<{
  label: string;
  fieldName: keyof Profile;
  values: string[];
  setProfile: React.Dispatch<React.SetStateAction<Partial<Profile>>>;
  error?: string;
  onTouch?: () => void;
  required?: boolean;
}> = ({ label, fieldName, values, setProfile, error, onTouch, required }) => {
  const handleChange = useCallback(
    (index: number, value: string) => {
      setProfile((prev) => {
        const current = (prev[fieldName] as string[]) || [];
        const newArr = [...current];
        newArr[index] = value;
        return { ...prev, [fieldName]: newArr };
      });
    },
    [fieldName, setProfile]
  );

  const handleAdd = useCallback(() => {
    setProfile((prev) => {
      const current = (prev[fieldName] as string[]) || [];
      return { ...prev, [fieldName]: [...current, ""] };
    });
  }, [fieldName, setProfile]);

  const handleRemove = useCallback(
    (index: number) => {
      setProfile((prev) => {
        const current = (prev[fieldName] as string[]) || [];
        return { ...prev, [fieldName]: current.filter((_, i) => i !== index) };
      });
      onTouch?.();
    },
    [fieldName, setProfile, onTouch]
  );

  return (
    <div style={{ marginBottom: "1rem" }}>
      <label style={{ fontWeight: "bold", display: "block", marginBottom: "0.5rem" }}>
        {label}{required && <Asterisk />}
      </label>
      {values.map((item, idx) => (
        <div key={idx} style={{ display: "flex", marginBottom: "0.5rem", gap: "0.5rem" }}>
          <input
            type="text"
            value={item}
            onChange={(e) => handleChange(idx, e.target.value)}
            placeholder={`Enter ${label.toLowerCase()}`}
            style={{
              flex: 1,
              padding: "0.5rem",
              border: `1px solid ${error ? "#dc3545" : "#ccc"}`,
              borderRadius: "4px",
            }}
          />
          <button
            type="button"
            onClick={() => handleRemove(idx)}
            style={{
              padding: "0.5rem 1rem",
              backgroundColor: "#dc3545",
              color: "#fff",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            Remove
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={handleAdd}
        style={{
          padding: "0.3rem 0.8rem",
          backgroundColor: "#6c757d",
          color: "#fff",
          border: "none",
          borderRadius: "4px",
          cursor: "pointer",
        }}
      >
        Add {label.slice(0, -1)}
      </button>
      <FieldError message={error} />
    </div>
  );
};

// Section heading with a horizontal rule
const SectionHeading: React.FC<{ title: string }> = ({ title }) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      gap: "0.75rem",
      margin: "2.5rem 0 1.5rem",
    }}
  >
    <span
      style={{
        fontWeight: 700,
        fontSize: "1rem",
        color: "#333",
        whiteSpace: "nowrap",
        textTransform: "uppercase",
        letterSpacing: "0.06em",
      }}
    >
      {title}
    </span>
    <div style={{ flex: 1, height: "1px", backgroundColor: "#ddd" }} />
  </div>
);

// ── Section definitions ───────────────────────────────────────────────────────

const SECTIONS = [
  { id: "basic",       label: "Basic Info"  },
  { id: "location",    label: "Location"    },
  { id: "preferences", label: "Preferences" },
  { id: "interests",   label: "Interests"   },
  { id: "photo",       label: "Photo"       },
] as const;

type SectionId = (typeof SECTIONS)[number]["id"];

// ── Main component ────────────────────────────────────────────────────────────

const ProfileForm: React.FC<Props> = ({ onProfileCreated }) => {
  const defaultMatchPreferences = ["location", "age", "hobbies", "music", "connections"];
  const allMatchPreferences = [...defaultMatchPreferences, "interests", "food", "personality"];

  const [profile, setProfile] = useState<Partial<Profile>>({
    first_name: "",
    last_name: "",
    birthdate: "",
    gender: "",
    bio: "",
    city: "",
    latitude: undefined,
    longitude: undefined,
    interests: [],
    hobbies: [],
    music_preferences: [],
    food_preferences: [],
    personality_traits: [],
    match_preferences: defaultMatchPreferences,
    max_distance_km: undefined,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [locating, setLocating] = useState(false);
  const [locationStatus, setLocationStatus] = useState<"idle" | "success" | "error">("idle");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [pictureFile, setPictureFile] = useState<File | null>(null);
  const [picturePreview, setPicturePreview] = useState<string | null | undefined>(null);
  const [isNewProfile, setIsNewProfile] = useState(false);
  const [activeSection, setActiveSection] = useState<SectionId>("basic");

  // ── Validation state ──────────────────────────────────────────────────────
  const [errors, setErrors] = useState<ErrorMap>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);

  const sectionRefs = useRef<Partial<Record<SectionId, HTMLElement | null>>>({});
  const programmaticScrollRef = useRef(false);
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navigate = useNavigate();

  // Re-validate whenever profile changes, but only show errors for touched/submitted fields
  useEffect(() => {
    if (!submitAttempted && Object.keys(touched).length === 0) return;
    const allErrors = validate(profile);
    setErrors(() => {
      const shown: ErrorMap = {};
      for (const [key, msg] of Object.entries(allErrors)) {
        if (submitAttempted || touched[key]) shown[key] = msg;
      }
      return shown;
    });
  }, [profile, touched, submitAttempted]);

  const touch = useCallback((field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  }, []);

  const handleBlur = (
    e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    touch(e.target.name);
  };

  // ── Geolocation ───────────────────────────────────────────────────────────

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationStatus("error");
      return;
    }
    setLocating(true);
    setLocationStatus("idle");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setProfile((prev) => ({
          ...prev,
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        }));
        setLocating(false);
        setLocationStatus("success");
      },
      (err) => {
        console.warn("Geolocation error:", err);
        setLocating(false);
        setLocationStatus("error");
      },
      { timeout: 10000 }
    );
  }, []);

  // ── Data fetching ─────────────────────────────────────────────────────────

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await getMyProfile();
        setProfile(res.data);
        if (res.data.profile_picture) setPicturePreview(avatarUrl(res.data.profile_picture));
        if (res.data.latitude != null && res.data.longitude != null) setLocationStatus("success");
        setIsNewProfile(false);
      } catch (err) {
        console.error("Error fetching profile:", err);
        setIsNewProfile(true);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  useEffect(() => {
    if (!loading && locationStatus === "idle") requestLocation();
  }, [loading, requestLocation]);

  // ── Scroll-based active section tracking ─────────────────────────────────

  useEffect(() => {
    if (loading) return;
    const handleScroll = () => {
      if (programmaticScrollRef.current) return;
      // If scrolled to the bottom, always activate the last section
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      const atBottom = maxScroll <= 0 || window.scrollY >= maxScroll - 50;
      if (atBottom) {
        setActiveSection(SECTIONS[SECTIONS.length - 1].id);
        return;
      }
      const scrollY = window.scrollY + 80;
      let current: SectionId = SECTIONS[0].id;
      for (const { id } of SECTIONS) {
        const el = sectionRefs.current[id];
        if (el && el.offsetTop <= scrollY) current = id;
      }
      setActiveSection(current);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, [loading]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setProfile((prev) => ({
      ...prev,
      [name]: name === "max_distance_km" ? (value ? parseInt(value) : undefined) : value,
    }));
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setPictureFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setPicturePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const toggleMatchPreference = (preference: string) => {
    const current = (profile.match_preferences as string[]) || [];
    const next = current.includes(preference)
      ? current.filter((p) => p !== preference)
      : [...current, preference];
    setProfile((prev) => ({ ...prev, match_preferences: next }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const allErrors = validate(profile);

    if (Object.keys(allErrors).length > 0) {
      setSubmitAttempted(true);
      setErrors(allErrors);
      // Scroll to the first visible error after the DOM updates
      setTimeout(() => {
        const firstError = document.querySelector("[data-field-error]");
        firstError?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 50);
      return;
    }

    setSaving(true);
    setMessage(null);
    try {
      if (pictureFile) {
        const picRes = await uploadProfilePicture(pictureFile);
        profile.profile_picture = picRes.data.url;
      }
      if (isNewProfile) {
        await createProfile(profile as Profile);
        if (onProfileCreated) onProfileCreated();
      } else {
        await updateMyProfile(profile as Profile);
      }
      setMessage({ type: "success", text: "Profile updated successfully!" });
      setTimeout(() => navigate("/profile"), 1000);
    } catch (err: any) {
      console.error("Error saving profile:", err);
      setMessage({
        type: "error",
        text: err.response?.data?.message || "Failed to save profile",
      });
    } finally {
      setSaving(false);
    }
  };

  const scrollToSection = (id: SectionId) => {
    setActiveSection(id);
    programmaticScrollRef.current = true;
    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    sectionRefs.current[id]?.scrollIntoView({ behavior: "smooth", block: "start" });
    scrollTimeoutRef.current = setTimeout(() => {
      programmaticScrollRef.current = false;
    }, 700);
  };

  // ── Shared styles ─────────────────────────────────────────────────────────

  const inputStyle = (field: string): React.CSSProperties => ({
    width: "100%",
    padding: "0.5rem",
    border: `1px solid ${errors[field] ? "#dc3545" : "#ccc"}`,
    borderRadius: "4px",
    boxSizing: "border-box",
  });

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return <div style={{ padding: "2rem", textAlign: "center" }}>Loading profile...</div>;
  }

  return (
    <div style={{ maxWidth: "600px", margin: "0 auto", padding: "2rem 2rem 4rem" }}>
      <h2 style={{ marginBottom: "0.5rem" }}>Edit Your Profile</h2>
      <p style={{ fontSize: "0.85rem", color: "#666", marginBottom: "1rem" }}>
        <span style={{ color: "#dc3545" }}>*</span> Required field
      </p>

      {/* ── Sticky section navigator ── */}
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          backgroundColor: "#fff",
          borderBottom: "1px solid #e0e0e0",
          paddingBottom: "0.5rem",
          marginBottom: "0.5rem",
        }}
      >
        <div style={{ display: "flex", gap: "0.25rem", flexWrap: "wrap", paddingTop: "0.5rem" }}>
          {SECTIONS.map(({ id, label }) => {
            const isActive = activeSection === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => scrollToSection(id)}
                style={{
                  padding: "0.35rem 0.75rem",
                  border: "none",
                  outline: "none",
                  borderRadius: "20px",
                  cursor: "pointer",
                  fontSize: "0.8rem",
                  fontWeight: isActive ? 700 : 400,
                  backgroundColor: isActive ? "#007bff" : "#f0f0f0",
                  color: isActive ? "#fff" : "#555",
                  transition: "background-color 0.15s, color 0.15s",
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {message && (
        <div
          style={{
            marginBottom: "1rem",
            padding: "1rem",
            backgroundColor: message.type === "success" ? "#d4edda" : "#f8d7da",
            border: message.type === "success" ? "1px solid #c3e6cb" : "1px solid #f5c6cb",
            borderRadius: "4px",
            color: message.type === "success" ? "#155724" : "#721c24",
          }}
        >
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>

        {/* ── Basic Info ── */}
        <section id="basic" ref={(el) => { sectionRefs.current.basic = el; }}>
          <SectionHeading title="Basic Info" />

          <div style={{ marginBottom: "1rem" }}>
            <label style={{ fontWeight: "bold", display: "block", marginBottom: "0.5rem" }}>
              First Name<Asterisk />
            </label>
            <input
              type="text"
              name="first_name"
              placeholder="First Name"
              value={profile.first_name || ""}
              onChange={handleChange}
              onBlur={handleBlur}
              style={inputStyle("first_name")}
            />
            <FieldError message={errors.first_name} />
          </div>

          <div style={{ marginBottom: "1rem" }}>
            <label style={{ fontWeight: "bold", display: "block", marginBottom: "0.5rem" }}>
              Last Name<Asterisk />
            </label>
            <input
              type="text"
              name="last_name"
              placeholder="Last Name"
              value={profile.last_name || ""}
              onChange={handleChange}
              onBlur={handleBlur}
              style={inputStyle("last_name")}
            />
            <FieldError message={errors.last_name} />
          </div>

          <div style={{ marginBottom: "1rem" }}>
            <label style={{ fontWeight: "bold", display: "block", marginBottom: "0.5rem" }}>
              Birthdate<Asterisk />
            </label>
            <input
              type="date"
              name="birthdate"
              value={profile.birthdate ? profile.birthdate.split("T")[0] : ""}
              onChange={handleChange}
              onBlur={handleBlur}
              style={inputStyle("birthdate")}
            />
            <FieldError message={errors.birthdate} />
          </div>

          <div style={{ marginBottom: "1rem" }}>
            <label style={{ fontWeight: "bold", display: "block", marginBottom: "0.5rem" }}>
              Gender<Asterisk />
            </label>
            <select
              name="gender"
              value={profile.gender || ""}
              onChange={handleChange}
              onBlur={handleBlur}
              style={inputStyle("gender")}
            >
              <option value="">Select Gender</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
              <option value="Prefer not to say">Prefer not to say</option>
            </select>
            <FieldError message={errors.gender} />
          </div>

          <div style={{ marginBottom: "1rem" }}>
            <label style={{ fontWeight: "bold", display: "block", marginBottom: "0.5rem" }}>
              Bio<Asterisk />
            </label>
            <textarea
              name="bio"
              placeholder="Tell us about yourself"
              value={profile.bio || ""}
              onChange={handleChange}
              onBlur={handleBlur}
              rows={4}
              style={{ ...inputStyle("bio"), fontFamily: "inherit" }}
            />
            <FieldError message={errors.bio} />
          </div>
        </section>

        {/* ── Location ── */}
        <section id="location" ref={(el) => { sectionRefs.current.location = el; }}>
          <SectionHeading title="Location" />

          <div style={{ marginBottom: "1rem" }}>
            <label style={{ fontWeight: "bold", display: "block", marginBottom: "0.5rem" }}>
              City<Asterisk />
            </label>
            <input
              type="text"
              name="city"
              placeholder="City"
              value={profile.city || ""}
              onChange={handleChange}
              onBlur={handleBlur}
              style={inputStyle("city")}
            />
            <FieldError message={errors.city} />
          </div>

          <div style={{ marginBottom: "1rem" }}>
            <label style={{ fontWeight: "bold", display: "block", marginBottom: "0.5rem" }}>
              Your Location (for proximity matching)
            </label>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={requestLocation}
                disabled={locating}
                style={{
                  padding: "0.5rem 1rem",
                  backgroundColor: locating ? "#ccc" : "#007bff",
                  color: "#fff",
                  border: "none",
                  borderRadius: "4px",
                  cursor: locating ? "not-allowed" : "pointer",
                }}
              >
                {locating ? "Detecting..." : "📍 Use my location"}
              </button>

              {locationStatus === "success" && profile.latitude != null && (
                <span style={{ color: "#155724", fontSize: "0.9rem" }}>
                  ✅ Location saved ({Number(profile.latitude).toFixed(4)},{" "}
                  {Number(profile.longitude).toFixed(4)})
                </span>
              )}

              {locationStatus === "error" && (
                <span style={{ color: "#721c24", fontSize: "0.9rem" }}>
                  ❌ Location unavailable — proximity matching will use city name only
                </span>
              )}
            </div>
            <div style={{ fontSize: "0.8rem", color: "#888", marginTop: "0.4rem" }}>
              Required for accurate distance-based matching. Your browser will ask for permission.
            </div>
          </div>

          <div style={{ marginBottom: "1rem" }}>
            <label style={{ fontWeight: "bold", display: "block", marginBottom: "0.5rem" }}>
              Max Distance (km)
            </label>
            <input
              type="number"
              name="max_distance_km"
              placeholder="Default: 100km"
              value={profile.max_distance_km || ""}
              onChange={handleChange}
              style={inputStyle("max_distance_km")}
            />
          </div>
        </section>

        {/* ── Preferences ── */}
        <section id="preferences" ref={(el) => { sectionRefs.current.preferences = el; }}>
          <SectionHeading title="Preferences" />

          <div style={{ marginBottom: "1.5rem" }}>
            <div style={{ fontWeight: "bold", marginBottom: "0.5rem" }}>Match preferences</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem" }}>
              {allMatchPreferences.map((pref) => {
                const checked = (profile.match_preferences as string[] | undefined)?.includes(pref);
                const labelMap: Record<string, string> = {
                  location: "Location",
                  age: "Age",
                  hobbies: "Hobbies",
                  music: "Music",
                  connections: "Mutual connections",
                  interests: "Interests",
                  food: "Food preferences",
                  personality: "Personality traits",
                };
                return (
                  <label
                    key={pref}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.3rem",
                      padding: "0.4rem 0.6rem",
                      border: "1px solid #ccc",
                      borderRadius: "6px",
                      cursor: "pointer",
                      backgroundColor: checked ? "#e8f0ff" : "#fff",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleMatchPreference(pref)}
                    />
                    {labelMap[pref] ?? pref}
                  </label>
                );
              })}
            </div>
            <div style={{ fontSize: "0.85rem", color: "#555", marginTop: "0.5rem" }}>
              Choose which profile fields should be used to recommend matches.
            </div>
          </div>

        </section>

        {/* ── Interests ── */}
        <section id="interests" ref={(el) => { sectionRefs.current.interests = el; }}>
          <SectionHeading title="Interests" />
          <ArrayField
            label="Interests"
            fieldName="interests"
            values={profile.interests || []}
            setProfile={setProfile}
            error={errors.interests}
            onTouch={() => touch("interests")}
            required
          />
          <ArrayField
            label="Hobbies"
            fieldName="hobbies"
            values={profile.hobbies || []}
            setProfile={setProfile}
            error={errors.hobbies}
            onTouch={() => touch("hobbies")}
            required
          />
          <ArrayField
            label="Music Preferences"
            fieldName="music_preferences"
            values={profile.music_preferences || []}
            setProfile={setProfile}
            error={errors.music_preferences}
            onTouch={() => touch("music_preferences")}
            required
          />
          <ArrayField
            label="Food Preferences"
            fieldName="food_preferences"
            values={profile.food_preferences || []}
            setProfile={setProfile}
            error={errors.food_preferences}
            onTouch={() => touch("food_preferences")}
            required
          />
          <ArrayField
            label="Personality Traits"
            fieldName="personality_traits"
            values={profile.personality_traits || []}
            setProfile={setProfile}
            error={errors.personality_traits}
            onTouch={() => touch("personality_traits")}
            required
          />
        </section>

        {/* ── Photo ── */}
        <section id="photo" ref={(el) => { sectionRefs.current.photo = el; }}>
          <SectionHeading title="Photo" />

          <div style={{ marginBottom: "1rem" }}>
            <label style={{ fontWeight: "bold", display: "block", marginBottom: "0.5rem" }}>
              Profile Picture
            </label>
            {picturePreview && (
              <div
                style={{
                  marginBottom: "1rem",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "1rem",
                }}
              >
                <img
                  src={picturePreview ?? undefined}
                  alt="Preview"
                  style={{
                    width: "150px",
                    height: "150px",
                    objectFit: "cover",
                    borderRadius: "5px",
                  }}
                />
                <button
                  type="button"
                  onClick={() => {
                    setPicturePreview(null);
                    setPictureFile(null);
                    setProfile((prev) => ({ ...prev, profile_picture: null }));
                  }}
                  style={{
                    padding: "0.4rem 0.8rem",
                    backgroundColor: "#dc3545",
                    color: "#fff",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                  }}
                >
                  Remove picture
                </button>
              </div>
            )}
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              style={{
                width: "100%",
                padding: "0.5rem",
                border: "1px solid #ccc",
                borderRadius: "4px",
                boxSizing: "border-box",
              }}
            />
          </div>
        </section>

        {/* ── Actions ── */}
        <div style={{ display: "flex", gap: "1rem", marginTop: "2rem" }}>
          <button
            type="submit"
            disabled={saving}
            style={{
              padding: "0.75rem 1.5rem",
              backgroundColor: saving ? "#ccc" : "#007bff",
              color: "#fff",
              border: "none",
              borderRadius: "4px",
              cursor: saving ? "not-allowed" : "pointer",
              fontSize: "1rem",
              fontWeight: "bold",
            }}
          >
            {saving ? "Saving..." : "Save Profile"}
          </button>
          <button
            type="button"
            onClick={() => navigate("/profile")}
            style={{
              padding: "0.75rem 1.5rem",
              backgroundColor: "#6c757d",
              color: "#fff",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "1rem",
            }}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default ProfileForm;
