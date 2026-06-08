import { Module } from '@nestjs/common';
import { WsGateway } from './websocket.gateway.js';

@Module({
  providers: [WsGateway],
})
export class WebsocketModule {}
