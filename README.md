# Match-Me

A LinkedIn-style social networking app that matches users based on profile data. Users can register, complete a profile, receive scored recommendations, connect with other users, and chat in real time.

## Features

- **Auth** — register / login / logout via JWT stored in an `httpOnly` cookie
- **Profiles** — create and edit a rich profile (bio, hobbies, interests, music, food, personality, location, picture)
- **Recommendations** — scored algorithm (location, age, hobbies, mutual connections, music) returns up to 10 matches
- **Connections** — send / accept / reject / disconnect; view pending requests
- **Real-time Chat** — Socket.io messaging between connected users; typing indicator; unread badge; paginated history
- **Online/Offline indicator** — shows live presence in chat view
- **Read receipts** — 👁 icon appears on sent messages when the recipient has read them


## Tech Stack
 
| Layer | Technology |
|-------|-----------|
| Backend | Java 21, Spring Boot 3, PostgreSQL (raw SQL via `JdbcTemplate`) |
| Auth | JWT (`jjwt`), `BCrypt`, `httpOnly` cookies |
| Real-time | Spring WebSocket |
| File uploads | Spring Multipart |
| Frontend | React 19, TypeScript, Vite, Axios |
 
## Prerequisites
 
- Java 21
- Maven 3.9+
- PostgreSQL ≥ 14
- Node.js ≥ 18 (frontend only)

## Setup

## 1. Clone and install dependencies

```bash
# Backend
cd backend-java
npm install

# Frontend
cd ../frontend
npm install
```

## 2. Configure environment variables
 
Create `backend-java/src/main/resources/application.properties`:
 
```properties
server.port=3000
spring.datasource.url=jdbc:postgresql://localhost:5432/matchme
spring.datasource.username=YOUR_DB_USER
spring.datasource.password=YOUR_DB_PASSWORD
spring.datasource.driver-class-name=org.postgresql.Driver
jwt.secret=your-secret-key-must-be-at-least-32-characters-long
jwt.expiration=86400000
spring.servlet.multipart.enabled=true
spring.servlet.multipart.max-file-size=10MB
spring.servlet.multipart.max-request-size=10MB
upload.dir=uploads
cors.allowed-origins=http://localhost:5173,http://localhost:5174
```


## 3. Create the database

```bash
psql -U postgres -c "CREATE DATABASE matchme;"
```

## 4. Run migrations

```bash
cd backend-java
mvn clean compile exec:java "-Dexec.mainClass=com.nexus.Migrate"
```

This runs all SQL files in `backend-java/migration/` in order. Safe to re-run — all migrations are idempotent.

## 5. Seeding users
```bash
# Add 120 users (keeps existing data)
cd backend-java
mvn compile exec:java "-Dexec.mainClass=com.nexus.Seed"

# Wipe everything and reseed fresh
mvn compile exec:java "-Dexec.mainClass=com.nexus.Seed" "-Dexec.args=--clear"
```

All seeded accounts use password: `admin`
Emails: `user1@gmail.com` … `user120@gmail.com`

## 6. Start the development servers

```bash
# Terminal 1 — backend (http://localhost:3000)
cd backend-java
mvn spring-boot:run

# Terminal 2 — frontend (http://localhost:5173)
cd frontend
npm run dev
```

Open `http://localhost:5173` in your browser.

## API Overview

All routes except `/auth/*` require a valid JWT cookie (`token`).

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/register` | Register |
| POST | `/auth/login` | Login |
| POST | `/auth/logout` | Logout |
| GET | `/me` | Authenticated user's public data |
| GET | `/me/profile` | Authenticated user's about-me data |
| GET | `/me/bio` | Authenticated user's bio data |
| GET | `/users/:id` | Public user data (name + picture) |
| GET | `/users/:id/profile` | User's about-me (restricted) |
| GET | `/users/:id/bio` | User's bio (restricted) |
| GET | `/profiles/me` | Full own profile |
| PUT | `/profiles/me` | Update own profile |
| POST | `/profiles/me/picture` | Upload profile picture |
| GET | `/recommendations` | Up to 10 recommended user IDs |
| POST | `/recommendations/dismiss` | Dismiss a recommendation |
| GET | `/connections` | List of connected user IDs |
| POST | `/connections/request` | Send connection request |
| POST | `/connections/accept` | Accept connection request |
| POST | `/connections/reject` | Reject connection request |
| POST | `/connections/disconnect` | Disconnect from a user |
| GET | `/connections/pending` | Pending incoming requests |
| GET | `/chats` | All chats (with unread count) |
| POST | `/chats` | Get or create chat with a user |
| GET | `/chats/:id/messages` | Paginated message history |
| PUT | `/chats/:id/read` | Mark chat as read |

### Socket.io Events

Authentication: JWT cookie sent automatically with `withCredentials: true`.

| Direction | Event | Payload |
|-----------|-------|---------|
| Client → Server | `chat:join` | `chatId: string` |
| Client → Server | `message:send` | `{ chatId, content }` |
| Client → Server | `typing:start` | `chatId: string` |
| Client → Server | `typing:stop` | `chatId: string` |
| Server → Client | `message:new` | message row |
| Server → Client | `chat:updated` | `{ chatId }` |
| Server → Client | `chat:read` | `{ chatId }` |
| Server → Client | `typing:start` | `userId: string` |
| Server → Client | `typing:stop` | `userId: string` |
| Server → Client | `user:online` | `userId: string` |
| Server → Client | `user:offline` | `userId: string` |

## Recommendation Algorithm

Candidates are first filtered, then scored. Only users with score > 0 are returned, sorted highest first, capped at 10.

### Filters (applied before scoring)
- Users already connected, requested, rejected or dismissed are excluded
- Users beyond the current user's `max_distance_km` radius are excluded (default: 100km)
- If GPS coordinates are available for both users, the Haversine formula is used for accurate distance
- If GPS is unavailable, city name similarity is used as a fallback
- Only users with a completed profile are considered

### Scoring

| Dimension | Condition | Points |
|-----------|-----------|--------|
| Location (preferred) | < 10km away | +30 |
| Location (preferred) | 10–50km away | +21 |
| Location (preferred) | 50–100km away | +12 |
| Location (preferred) | 100km+ away | +3 |
| Location (not preferred) | < 10km away | +10 |
| Location (not preferred) | 10–50km away | +7 |
| Location (not preferred) | 50–100km away | +4 |
| Location (not preferred) | 100km+ away | +1 |
| Location (no GPS, preferred) | Same city | +30 |
| Age | 0–1 years apart | +20 |
| Age | 2–3 years apart | +15 |
| Age | 4–5 years apart | +10 |
| Age | 6–8 years apart | +5 |
| Age | 9+ years apart | +0 |
| Hobbies | Each shared hobby (max 5) | +10 each |
| Mutual connections | Each shared friend (max 5) | +10 each |
| Music | Each shared genre (max 8) | +5 each |
| Interests | Each shared interest (max 5) | +5 each |
| Food preferences | Each shared preference (max 5) | +5 each |
| Personality traits | Each shared trait (max 5) | +5 each |

**Maximum possible score: 265 points**

Scoring dimensions are weighted by the user's `match_preferences` — if a dimension is unticked, it contributes 0 points. Location always contributes a minimum base score when GPS data is available, regardless of preferences, to ensure nearby users are never silently excluded.

## Project Structure

```
backend-java/
  migration/          # SQL migration files (run in order)
  src/main/java/com/nexus/
    NexusApplication.java     # Spring Boot entry point
    Migrate.java              # Migration runner
    Seed.java                 # Seed script (120 fictitious users)
    config/
      SecurityConfig.java     # CORS, BCrypt, JWT filter, route protection
    middleware/
      JwtAuthFilter.java      # Reads JWT from httpOnly cookie
    util/
      JwtUtil.java            # Token generation and validation
      AuthUtil.java           # Gets current userId from security context
      ProfileJsonUtil.java    # Parses JSONB fields from DB rows
    features/
      auth/                   # register, login, logout
      profiles/               # create, get, update, picture upload
      users/                  # /users/:id and /me endpoints
      recommendations/        # scoring algorithm + dismiss
      connections/            # request, accept, reject, disconnect
      relationships/          # relationship status helper
      chat/                   # REST chat endpoints
    socket/
      WebSocketConfig.java    # WebSocket event handlers (real-time)
  src/main/resources/
    application.properties    # Server config (port, DB, JWT, CORS)
 
frontend/
  src/
    api.ts            # Axios client + all API calls
    types.ts          # Shared TypeScript types
    App.tsx           # Router + auth state
    chat/             # ChatListPage, ChatViewPage, socket client
    components/       # Login, ProfileForm, ProfileView, Header
    connections/      # ConnectionsPage, PendingRequestsPage
    recommendation/   # RecommendationPage, RecommendationCard
```
