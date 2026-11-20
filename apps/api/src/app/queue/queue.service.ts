import {
  BadRequestException,
  ConflictException,
  HttpException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { SessionStatus, TokenStatus } from '@medical-proj/shared-models';
import { PrismaService } from '../prisma/prisma.service';
import { QueueGateway } from './queue.gateway';
import {
  CallTokenDto,
  CompleteCheckupDto,
  HoldTokenDto,
  NoShowTokenDto,
  StartCheckupDto,
} from './dto/queue.dto';

@Injectable()
export class QueueService {
  private readonly logger = new Logger(QueueService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly queueGateway: QueueGateway,
  ) {}

  /**
   * Database Failover Interceptor
   */
  private handleDbError(error: unknown, action: string): never {
    if (error instanceof HttpException) {
      throw error;
    }
    this.logger.error(`Database connection error during ${action}: ${(error as Error).message}`);
    throw new ServiceUnavailableException(
      'Database service is temporarily unreachable. Please ensure PostgreSQL is running and retry.',
    );
  }

  /**
   * 1. Call Token (status -> CALLED)
   * Advances session serving number, stamps calledAt, and broadcasts queue:token_called.
   */
  async callToken(sessionId: string, dto: CallTokenDto) {
    try {
      const session = await this.prisma.session.findUnique({
        where: { id: sessionId },
      });
      if (!session) {
        throw new NotFoundException(`Session with ID '${sessionId}' not found`);
      }

      if (session.status === SessionStatus.CLOSED) {
        throw new BadRequestException('Cannot call tokens in a CLOSED session');
      }

      const token = await this.prisma.token.findUnique({
        where: {
          sessionId_tokenNumber: {
            sessionId,
            tokenNumber: dto.tokenNumber,
          },
        },
      });

      if (!token) {
        throw new NotFoundException(`Token #${dto.tokenNumber} not found in this session`);
      }

      if (
        token.status === TokenStatus.COMPLETED ||
        token.status === TokenStatus.CANCELLED ||
        token.status === TokenStatus.NO_SHOW
      ) {
        throw new BadRequestException(
          `Cannot call token #${dto.tokenNumber}: Token is already ${token.status}`,
        );
      }

      const now = new Date();

      // Atomic update of token and session state
      const updatedToken = await this.prisma.$transaction(async tx => {
        const t = await tx.token.update({
          where: { id: token.id },
          data: {
            status: TokenStatus.CALLED,
            calledAt: now,
          },
        });

        // Automatically advance session to OPD_STARTED if it was NOT_ARRIVED or ARRIVED
        const newSessionStatus =
          session.status === SessionStatus.NOT_ARRIVED || session.status === SessionStatus.ARRIVED
            ? SessionStatus.OPD_STARTED
            : session.status;

        await tx.session.update({
          where: { id: sessionId },
          data: {
            currentServingTokenNumber: dto.tokenNumber,
            status: newSessionStatus,
          },
        });

        return t;
      });

      // WebSocket Broadcast to all clients in session room
      this.queueGateway.broadcastTokenCalled(sessionId, {
        tokenNumber: dto.tokenNumber,
        patientName: token.patientName,
        calledAt: now.toISOString(),
      });

      this.queueGateway.broadcastQueueStateUpdated(sessionId, {
        currentServingTokenNumber: dto.tokenNumber,
      });

      return updatedToken;
    } catch (error) {
      this.handleDbError(error, `calling token #${dto.tokenNumber}`);
    }
  }

  /**
   * 2. Start Checkup (status -> SERVING)
   * Doctor begins the consultation; stamps checkupStartedAt and broadcasts queue:token_serving.
   */
  async startCheckup(sessionId: string, dto: StartCheckupDto) {
    try {
      const session = await this.prisma.session.findUnique({
        where: { id: sessionId },
      });
      if (!session) {
        throw new NotFoundException(`Session with ID '${sessionId}' not found`);
      }

      const token = await this.prisma.token.findUnique({
        where: {
          sessionId_tokenNumber: {
            sessionId,
            tokenNumber: dto.tokenNumber,
          },
        },
      });

      if (!token) {
        throw new NotFoundException(`Token #${dto.tokenNumber} not found in this session`);
      }

      if (token.status === TokenStatus.COMPLETED || token.status === TokenStatus.CANCELLED) {
        throw new BadRequestException(
          `Cannot start checkup for token #${dto.tokenNumber}: Already ${token.status}`,
        );
      }

      const now = new Date();

      const updatedToken = await this.prisma.token.update({
        where: { id: token.id },
        data: {
          status: TokenStatus.SERVING,
          checkupStartedAt: now,
        },
      });

      // WebSocket Broadcast
      this.queueGateway.broadcastTokenServing(sessionId, {
        tokenNumber: dto.tokenNumber,
        patientName: token.patientName,
        startedAt: now.toISOString(),
      });

      return updatedToken;
    } catch (error) {
      this.handleDbError(error, `starting checkup for token #${dto.tokenNumber}`);
    }
  }

  /**
   * 3. Hold Token (status -> ON_HOLD)
   * Temporarily puts a patient on hold and increments holdCount.
   */
  async holdToken(sessionId: string, dto: HoldTokenDto) {
    try {
      const token = await this.prisma.token.findUnique({
        where: {
          sessionId_tokenNumber: {
            sessionId,
            tokenNumber: dto.tokenNumber,
          },
        },
      });

      if (!token) {
        throw new NotFoundException(`Token #${dto.tokenNumber} not found in this session`);
      }

      if (token.status === TokenStatus.COMPLETED || token.status === TokenStatus.CANCELLED) {
        throw new BadRequestException(
          `Cannot hold token #${dto.tokenNumber}: Already ${token.status}`,
        );
      }

      const updatedToken = await this.prisma.token.update({
        where: { id: token.id },
        data: {
          status: TokenStatus.ON_HOLD,
          holdCount: token.holdCount + 1,
        },
      });

      // WebSocket Broadcast
      this.queueGateway.broadcastTokenHeld(sessionId, {
        tokenNumber: dto.tokenNumber,
        patientName: token.patientName,
        holdCount: token.holdCount + 1,
        slotsToPushBack: dto.slotsToPushBack ?? 5,
      });

      return updatedToken;
    } catch (error) {
      this.handleDbError(error, `holding token #${dto.tokenNumber}`);
    }
  }

  /**
   * 4. Complete Checkup (status -> COMPLETED)
   * Records consultation duration, recalculates doctor's rolling average duration,
   * updates the Session record, and broadcasts queue:token_completed.
   */
  async completeCheckup(sessionId: string, dto: CompleteCheckupDto) {
    try {
      const session = await this.prisma.session.findUnique({
        where: { id: sessionId },
      });
      if (!session) {
        throw new NotFoundException(`Session with ID '${sessionId}' not found`);
      }

      const token = await this.prisma.token.findUnique({
        where: {
          sessionId_tokenNumber: {
            sessionId,
            tokenNumber: dto.tokenNumber,
          },
        },
      });

      if (!token) {
        throw new NotFoundException(`Token #${dto.tokenNumber} not found in this session`);
      }

      if (token.status === TokenStatus.COMPLETED) {
        throw new BadRequestException(`Token #${dto.tokenNumber} is already COMPLETED`);
      }

      const now = new Date();
      const startedAt = token.checkupStartedAt ?? token.calledAt ?? now;
      const durationSeconds = Math.max(
        60,
        Math.round((now.getTime() - startedAt.getTime()) / 1000),
      );

      // Recalculate rolling average duration (using last 5 completed tokens in this session)
      const result = await this.prisma.$transaction(async tx => {
        const completedToken = await tx.token.update({
          where: { id: token.id },
          data: {
            status: TokenStatus.COMPLETED,
            checkupCompletedAt: now,
            consultationDurationSeconds: durationSeconds,
          },
        });

        const recentCompleted = await tx.token.findMany({
          where: {
            sessionId,
            status: TokenStatus.COMPLETED,
            consultationDurationSeconds: { not: null },
          },
          orderBy: { checkupCompletedAt: 'desc' },
          take: 5,
          select: { consultationDurationSeconds: true },
        });

        const allDurations = recentCompleted.map(t => t.consultationDurationSeconds as number);
        const newRollingAvgSeconds = Math.round(
          allDurations.reduce((a, b) => a + b, 0) / allDurations.length,
        );

        await tx.session.update({
          where: { id: sessionId },
          data: {
            rollingAvgDurationSeconds: newRollingAvgSeconds,
          },
        });

        return { completedToken, newRollingAvgSeconds };
      });

      // WebSocket Broadcast
      this.queueGateway.broadcastTokenCompleted(sessionId, {
        tokenNumber: dto.tokenNumber,
        durationSeconds,
        rollingAvgDurationSeconds: result.newRollingAvgSeconds,
      });

      this.queueGateway.broadcastQueueStateUpdated(sessionId, {
        currentServingTokenNumber: session.currentServingTokenNumber,
        rollingAvgDurationSeconds: result.newRollingAvgSeconds,
      });

      return result.completedToken;
    } catch (error) {
      this.handleDbError(error, `completing checkup for token #${dto.tokenNumber}`);
    }
  }

  /**
   * 5. Mark No-Show (status -> NO_SHOW)
   */
  async markNoShow(sessionId: string, dto: NoShowTokenDto) {
    try {
      const token = await this.prisma.token.findUnique({
        where: {
          sessionId_tokenNumber: {
            sessionId,
            tokenNumber: dto.tokenNumber,
          },
        },
      });

      if (!token) {
        throw new NotFoundException(`Token #${dto.tokenNumber} not found in this session`);
      }

      if (token.status === TokenStatus.COMPLETED) {
        throw new BadRequestException(`Cannot mark COMPLETED token #${dto.tokenNumber} as No-Show`);
      }

      const updatedToken = await this.prisma.token.update({
        where: { id: token.id },
        data: {
          status: TokenStatus.NO_SHOW,
          cancellationReason: dto.reason ?? 'Marked as No-Show by clinic desk',
        },
      });

      // WebSocket Broadcast
      this.queueGateway.broadcastTokenNoShow(sessionId, {
        tokenNumber: dto.tokenNumber,
        reason: dto.reason ?? 'No-Show',
      });

      return updatedToken;
    } catch (error) {
      this.handleDbError(error, `marking token #${dto.tokenNumber} as No-Show`);
    }
  }

  /**
   * 6. Retrieve Live Full Queue State for a Session
   * Aggregates doctor metadata, active token roster, and live dynamic wait metrics.
   */
  async getLiveQueueState(sessionId: string) {
    try {
      const session = await this.prisma.session.findUnique({
        where: { id: sessionId },
        include: {
          doctor: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  avatarUrl: true,
                  phone: true,
                },
              },
              department: true,
            },
          },
          clinic: {
            select: {
              id: true,
              name: true,
              city: true,
              address: true,
            },
          },
          tokens: {
            orderBy: [{ tokenNumber: 'asc' }],
            select: {
              id: true,
              tokenNumber: true,
              universalTrackingId: true,
              patientName: true,
              patientPhone: true,
              status: true,
              holdCount: true,
              calledAt: true,
              checkupStartedAt: true,
              checkupCompletedAt: true,
              consultationDurationSeconds: true,
            },
          },
        },
      });

      if (!session) {
        throw new NotFoundException(`Session with ID '${sessionId}' not found`);
      }

      const totalBooked = session.tokens.filter(
        t => t.status === TokenStatus.BOOKED || t.status === TokenStatus.ON_HOLD,
      ).length;
      const totalCompleted = session.tokens.filter(t => t.status === TokenStatus.COMPLETED).length;
      const totalNoShow = session.tokens.filter(t => t.status === TokenStatus.NO_SHOW).length;

      const avgMinutes = Math.round(session.rollingAvgDurationSeconds / 60) || 10;
      const estimatedQueueCompletionMinutes = totalBooked * avgMinutes;

      return {
        session: {
          id: session.id,
          date: session.date,
          sessionType: session.sessionType,
          status: session.status,
          currentServingTokenNumber: session.currentServingTokenNumber,
          rollingAvgDurationSeconds: session.rollingAvgDurationSeconds,
          tokenCapacity: session.tokenCapacity,
        },
        doctor: session.doctor,
        clinic: session.clinic,
        metrics: {
          totalTokensIssued: session.tokens.length,
          waitingPatients: totalBooked,
          completedPatients: totalCompleted,
          noShowPatients: totalNoShow,
          avgDurationMinutesPerPatient: avgMinutes,
          estimatedQueueCompletionMinutes,
        },
        tokens: session.tokens,
      };
    } catch (error) {
      this.handleDbError(error, `fetching live queue state for session '${sessionId}'`);
    }
  }
}
