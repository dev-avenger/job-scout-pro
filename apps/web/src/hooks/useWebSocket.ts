import { useEffect, useRef, useCallback, useState } from 'react';
import { useAuthStore } from '../stores/auth-store';

interface WebSocketMessage {
  type: string;
  data: unknown;
  timestamp: string;
}

export function useWebSocket(onMessage?: (msg: WebSocketMessage) => void) {
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const token = useAuthStore((s) => s.accessToken);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws?token=${token}`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => setConnected(true);
    ws.onclose = () => {
      setConnected(false);
      setTimeout(connect, 5000);
    };
    ws.onerror = () => ws.close();
    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data) as WebSocketMessage;
        onMessage?.(msg);
      } catch {}
    };
  }, [token, onMessage]);

  useEffect(() => {
    if (token) connect();
    return () => { wsRef.current?.close(); };
  }, [token, connect]);

  const send = useCallback((data: unknown) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    }
  }, []);

  return { connected, send };
}
