import { createServer } from "http";
import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import app from "./app";
import { PORT, JWT_SECRET } from "./config/env";
import { socketEvents } from "./services/events";

const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: ["http://localhost:5173", "http://localhost:5174"],
    credentials: true,
  },
});

io.use((socket, next) => {
  const cookieHeader = socket.handshake.headers.cookie ?? "";
  const match = cookieHeader.match(/(?:^|;\s*)token=([^;]+)/);
  const token = match?.[1];

  if (!token) return next(new Error("Not authenticated"));

  try {
    const payload = jwt.verify(token, JWT_SECRET) as { userId: string };
    socket.data.userId = payload.userId;
    next();
  } catch {
    next(new Error("Invalid token"));
  }
});

socketEvents(io);

httpServer.listen(PORT, () => console.log(`Server running on port ${PORT}`));

export default app;
