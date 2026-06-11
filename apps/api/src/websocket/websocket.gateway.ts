import { WebSocketGateway, WebSocketServer, OnGatewayConnection, OnGatewayDisconnect, SubscribeMessage, MessageBody, ConnectedSocket } from '@nestjs/websockets';
import { Inject, OnModuleInit } from '@nestjs/common';
import type { Server, WebSocket } from 'ws';
import type { Redis } from 'ioredis';
import { createLogger } from '@auto-job-apply/shared-utils';
import { REDIS_CLIENT } from '../core/redis/redis.constants.js';

const logger = createLogger({ name: 'websocket' });

interface WSClient {
  socket: WebSocket;
  userId: string;
  channels: Set<string>;
}

@WebSocketGateway({ path: '/ws' })
export class WsGateway implements OnGatewayConnection, OnGatewayDisconnect, OnModuleInit {
  @WebSocketServer()
  server!: Server;

  private clients: Map<string, WSClient[]> = new Map();

  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  onModuleInit() {
    this.setupRedisSubscription();
  }

  handleConnection(client: WebSocket & { userId?: string }) {
    // Client userId should be set during authentication
    // For now, clients send an auth message after connecting
    logger.info('WebSocket client connected');
  }

  handleDisconnect(client: WebSocket & { userId?: string }) {
    if (client.userId) {
      this.removeClient(client.userId, client);
    }
    logger.info('WebSocket client disconnected');
  }

  @SubscribeMessage('auth')
  handleAuth(@ConnectedSocket() client: WebSocket & { userId?: string }, @MessageBody() data: { userId: string }) {
    client.userId = data.userId;
    this.addClient(data.userId, client);
    return { event: 'auth', data: { status: 'authenticated' } };
  }

  @SubscribeMessage('subscribe')
  handleSubscribe(@ConnectedSocket() client: WebSocket & { userId?: string }, @MessageBody() data: { channels: string[] }) {
    if (!client.userId) return;

    const clients = this.clients.get(client.userId) || [];
    const wsClient = clients.find((c) => c.socket === client);
    if (wsClient && Array.isArray(data.channels)) {
      for (const channel of data.channels) {
        wsClient.channels.add(channel);
      }
    }
  }

  private setupRedisSubscription() {
    const subscriber = this.redis.duplicate();
    const channels = [
      'agent:activity',
      'job:discovered',
      'app:status',
      'notification:new',
      'captcha:needed',
      'budget:alert',
    ];

    subscriber.subscribe(...channels).catch((err: unknown) => {
      logger.error({ error: err }, 'Failed to subscribe to Redis channels');
    });

    subscriber.on('message', (channel: string, message: string) => {
      try {
        const data = JSON.parse(message);
        this.broadcast(data.userId, { channel, data });
      } catch (err) {
        logger.error({ error: err, channel }, 'Failed to process Redis message');
      }
    });
  }

  private broadcast(userId: string, payload: unknown) {
    const clients = this.clients.get(userId) || [];
    const message = JSON.stringify(payload);
    for (const client of clients) {
      if (client.socket.readyState === 1) {
        client.socket.send(message);
      }
    }
  }

  private addClient(userId: string, socket: WebSocket) {
    const existing = this.clients.get(userId) || [];
    existing.push({ socket, userId, channels: new Set() });
    this.clients.set(userId, existing);
  }

  private removeClient(userId: string, socket: WebSocket) {
    const existing = this.clients.get(userId) || [];
    const index = existing.findIndex((c) => c.socket === socket);
    if (index !== -1) {
      existing.splice(index, 1);
    }
    if (existing.length === 0) {
      this.clients.delete(userId);
    }
  }
}
