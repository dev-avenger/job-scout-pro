import { useAuthStore } from '../stores/auth-store';

export type WSEventHandler = (event: { channel: string; data: unknown }) => void;

class WSManager {
  private ws: WebSocket | null = null;
  private handlers: WSEventHandler[] = [];
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  connect() {
    const token = useAuthStore.getState().accessToken;
    if (!token) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const url = `${protocol}//${window.location.host}/ws?token=${token}`;

    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      this.ws?.send(JSON.stringify({
        type: 'subscribe',
        channels: ['activity', 'notifications', 'jobs', 'app:status'],
      }));
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        for (const handler of this.handlers) {
          handler(data);
        }
      } catch {
        // ignore parse errors
      }
    };

    this.ws.onclose = () => {
      this.reconnectTimer = setTimeout(() => this.connect(), 5000);
    };
  }

  disconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.ws?.close();
    this.ws = null;
  }

  onMessage(handler: WSEventHandler) {
    this.handlers.push(handler);
    return () => {
      this.handlers = this.handlers.filter((h) => h !== handler);
    };
  }
}

export const wsManager = new WSManager();
