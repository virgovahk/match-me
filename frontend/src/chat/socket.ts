import { API_URL } from "../api";

type Handler = (...args: unknown[]) => void;

// How to extract the handler argument from each incoming message type
const PAYLOAD_EXTRACTORS: Record<string, (d: Record<string, unknown>) => unknown> = {
  "message:new":  (d) => d.message,
  "typing:start": (d) => d.userId,
  "typing:stop":  (d) => d.userId,
  "user:online":  (d) => d.userId,
  "user:offline": (d) => d.userId,
  "chat:read":    (d) => ({ chatId: d.chatId }),
  "chat:updated": (_d) => undefined,
};

// Which property name to use when emit() receives a primitive value
const EMIT_KEYS: Record<string, string> = {
  "chat:join":    "chatId",
  "user:status":  "userId",
  "typing:start": "chatId",
  "typing:stop":  "chatId",
};

class NativeSocket {
  private ws: WebSocket | null = null;
  private listeners = new Map<string, Set<Handler>>();
  private connecting = false;
  private queue: string[] = []; // buffered messages while connecting

  get connected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  connect(): void {
    if (this.connecting || this.connected) return;
    this.connecting = true;
    this._doConnect().finally(() => { this.connecting = false; });
  }

  private async _doConnect(): Promise<void> {
    try {
      const res = await fetch(`${API_URL}/auth/token`, { credentials: "include" });
      if (!res.ok) return;
      const { token } = await res.json() as { token: string };

      const wsUrl = `${API_URL.replace(/^http/, "ws")}/ws?token=${token}`;
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        // Flush any emits that were queued while connecting
        const pending = this.queue.splice(0);
        for (const msg of pending) {
          this.ws?.send(msg);
        }
      };

      this.ws.onclose = () => { this.ws = null; };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data as string) as Record<string, unknown>;
          const type = data.type as string;
          if (!type) return;

          const extractor = PAYLOAD_EXTRACTORS[type];
          const payload = extractor ? extractor(data) : data;

          this.listeners.get(type)?.forEach((h) => h(payload));
        } catch {
          // ignore parse errors
        }
      };
    } catch {
      // ignore connection errors
    }
  }

  disconnect(): void {
    this.ws?.close();
    this.ws = null;
    this.queue = [];
  }

  on(event: string, handler: Handler): void {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(handler);
  }

  off(event: string, handler: Handler): void {
    this.listeners.get(event)?.delete(handler);
  }

  emit(event: string, data?: unknown): void {
    let payload: Record<string, unknown>;
    if (data === undefined || data === null) {
      payload = { type: event };
    } else if (typeof data === "object" && !Array.isArray(data)) {
      payload = { type: event, ...(data as Record<string, unknown>) };
    } else {
      const key = EMIT_KEYS[event] ?? "data";
      payload = { type: event, [key]: data };
    }

    const msg = JSON.stringify(payload);

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(msg);
    } else {
      // Buffer it — will be sent once the socket opens
      this.queue.push(msg);
      // If not already connecting, start connection
      this.connect();
    }
  }
}

const socket = new NativeSocket();
export default socket;
