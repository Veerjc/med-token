import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Injectable, Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
@Injectable()
@WebSocketGateway({
  cors: {
    origin: '*', // Allows connections from Web (4200) and Mobile (4201)
  },
  namespace: '/queue',
})
export class QueueGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(QueueGateway.name);

  @WebSocketServer()
  server!: Server;

  afterInit(server: any) {
    this.logger.log('🚀 WebSocket Queue Gateway initialized on namespace /queue');
  }

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  /**
   * Client joins a specific session room (e.g. session:sess_123).
   * Used by Doctor live view, Receptionist desk, and Patient tracking pages.
   */
  @SubscribeMessage('joinSession')
  handleJoinSession(@ConnectedSocket() client: Socket, @MessageBody() data: { sessionId: string }) {
    const room = `session:${data.sessionId}`;
    client.join(room);
    this.logger.log(`Client ${client.id} joined room: ${room}`);
    return {
      event: 'joinedSession',
      data: {
        sessionId: data.sessionId,
        room,
        status: 'CONNECTED',
      },
    };
  }

  /**
   * Client leaves a specific session room.
   */
  @SubscribeMessage('leaveSession')
  handleLeaveSession(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sessionId: string },
  ) {
    const room = `session:${data.sessionId}`;
    client.leave(room);
    this.logger.log(`Client ${client.id} left room: ${room}`);
    return {
      event: 'leftSession',
      data: {
        sessionId: data.sessionId,
        status: 'DISCONNECTED',
      },
    };
  }

  /**
   * Universal session room broadcaster.
   * Dispatches live events to all sockets in the session room with a timestamp.
   */
  broadcastToSession(sessionId: string, event: string, payload: Record<string, unknown>) {
    if (!this.server) {
      this.logger.warn(`WebSocket server not ready; skipped event '${event}'`);
      return;
    }
    const room = `session:${sessionId}`;
    this.server.to(room).emit(event, {
      ...payload,
      timestamp: new Date().toISOString(),
    });
  }

  // =========================================================================
  // Typed Domain Event Broadcasters
  // =========================================================================
  /**
   * Broadcasts when a token is called to the doctor's room (CALLED)
   */
  broadcastTokenCalled(sessionId: string, data: Record<string, unknown>) {
    this.broadcastToSession(sessionId, 'queue:token_called', data);
  }
  /**
   * Broadcasts when the examination begins (SERVING)
   */
  broadcastTokenServing(sessionId: string, data: Record<string, unknown>) {
    this.broadcastToSession(sessionId, 'queue:token_serving', data);
  }
  /**
   * Broadcasts when a consultation is completed (COMPLETED) with updated rolling average
   */
  broadcastTokenCompleted(sessionId: string, data: Record<string, unknown>) {
    this.broadcastToSession(sessionId, 'queue:token_completed', data);
  }
  /**
   * Broadcasts when a patient is temporarily held (ON_HOLD) and pushed back
   */
  broadcastTokenHeld(sessionId: string, data: Record<string, unknown>) {
    this.broadcastToSession(sessionId, 'queue:token_held', data);
  }
  /**
   * Broadcasts when a patient is marked as No-Show (NO_SHOW)
   */
  broadcastTokenNoShow(sessionId: string, data: Record<string, unknown>) {
    this.broadcastToSession(sessionId, 'queue:token_noshow', data);
  }
  /**
   * Broadcasts when general queue metrics change (wait times, serving number)
   */
  broadcastQueueStateUpdated(sessionId: string, data: Record<string, unknown>) {
    this.broadcastToSession(sessionId, 'queue:state_updated', data);
  }
}
