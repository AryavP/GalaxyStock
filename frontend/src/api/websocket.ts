/**
 * WebSocket client for real-time market updates.
 */
import type { WebSocketMessage } from '../types';

// Derive WebSocket URL from API URL
const getWsUrl = () => {
  const apiUrl = import.meta.env.VITE_API_URL;
  if (apiUrl) {
    // Convert http(s):// to ws(s)://
    const wsUrl = apiUrl.replace(/^http/, 'ws').replace(/\/api$/, '');
    return `${wsUrl}/ws`;
  }
  return 'ws://localhost:8000/ws';
};

const WS_URL = getWsUrl();

type MessageHandler = (message: WebSocketMessage) => void;

export class MarketWebSocket {
  private ws: WebSocket | null = null;
  private messageHandlers: Set<MessageHandler> = new Set();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private isIntentionallyClosed = false;

  /**
   * Connect to the WebSocket server.
   */
  connect(): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      console.log('[WebSocket] Already connected');
      return;
    }

    this.isIntentionallyClosed = false;
    console.log('[WebSocket] Connecting to', WS_URL);

    try {
      this.ws = new WebSocket(WS_URL);

      this.ws.onopen = () => {
        console.log('[WebSocket] Connected');
        this.reconnectAttempts = 0;
      };

      this.ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          console.log('[WebSocket] Message received:', message.type);

          // Notify all handlers
          this.messageHandlers.forEach((handler) => {
            try {
              handler(message);
            } catch (error) {
              console.error('[WebSocket] Error in message handler:', error);
            }
          });
        } catch (error) {
          console.error('[WebSocket] Error parsing message:', error);
        }
      };

      this.ws.onerror = (error) => {
        console.error('[WebSocket] Error:', error);
      };

      this.ws.onclose = () => {
        console.log('[WebSocket] Connection closed');
        this.ws = null;

        // Attempt to reconnect if not intentionally closed
        if (!this.isIntentionallyClosed && this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++;
          const delay = this.reconnectDelay * this.reconnectAttempts;
          console.log(
            `[WebSocket] Reconnecting in ¢{delay}ms (attempt ¢{this.reconnectAttempts}/¢{this.maxReconnectAttempts})`
          );
          setTimeout(() => this.connect(), delay);
        }
      };
    } catch (error) {
      console.error('[WebSocket] Failed to create WebSocket:', error);
    }
  }

  /**
   * Disconnect from the WebSocket server.
   */
  disconnect(): void {
    this.isIntentionallyClosed = true;
    if (this.ws) {
      console.log('[WebSocket] Disconnecting');
      this.ws.close();
      this.ws = null;
    }
  }

  /**
   * Add a message handler.
   */
  addMessageHandler(handler: MessageHandler): void {
    this.messageHandlers.add(handler);
    console.log('[WebSocket] Handler added. Total handlers:', this.messageHandlers.size);
  }

  /**
   * Remove a message handler.
   */
  removeMessageHandler(handler: MessageHandler): void {
    this.messageHandlers.delete(handler);
    console.log('[WebSocket] Handler removed. Total handlers:', this.messageHandlers.size);
  }

  /**
   * Send a message to the server.
   */
  send(data: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    } else {
      console.warn('[WebSocket] Cannot send message, not connected');
    }
  }

  /**
   * Check if connected.
   */
  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
}

// Singleton instance
let marketWebSocket: MarketWebSocket | null = null;

/**
 * Get the singleton WebSocket instance.
 */
export const getMarketWebSocket = (): MarketWebSocket => {
  if (!marketWebSocket) {
    marketWebSocket = new MarketWebSocket();
  }
  return marketWebSocket;
};
