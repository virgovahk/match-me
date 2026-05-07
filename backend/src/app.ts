import express from "express";
import cookieParser from "cookie-parser";
import path from "path";
import cors from "cors";

import authRoutes from "./features/auth/auth.routes";
import userRoutes from "./features/users/users.routes";
import meRoutes from "./features/users/me.routes";
import profilesRoutes from "./features/profiles/profiles.routes";
import recommendationsRoutes from "./features/recommendations/recommendations.routes";
import connectionsRoutes from "./features/connections/connections.routes";
import chatRoutes from "./features/chat/chat.routes";

import { authenticate } from "./middleware/auth.middleware";

const app = express();

const corsOptions = {
  origin: ["http://localhost:5173", "http://localhost:5174"],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());

app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));

app.use("/auth", authRoutes);

app.use("/users", authenticate, userRoutes);
app.use("/me", authenticate, meRoutes);
app.use("/profiles", authenticate, profilesRoutes);
app.use("/recommendations", authenticate, recommendationsRoutes);
app.use("/connections", authenticate, connectionsRoutes);
app.use("/chats", authenticate, chatRoutes);

export default app;
