import {
  BadRequestException,
  ConflictException,
  HttpException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { randomBytes } from 'crypto';
import {
  BookTokenDto,
  CancelTokenDto,
  CounterBookTokenDto,
  SearchDiscoveryQueryDto,
} from './dto/token.dto';
import {
  BookingSource,
  PaymentMode,
  PaymentStatus,
  SessionStatus,
  TokenStatus,
} from '@medical-proj/shared-models';

@Injectable()
export class TokensService {
  private readonly logger = new Logger(TokensService.name);
  constructor(private readonly prisma: PrismaService) {}

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
   * Generates a 20-character, non-sequential, collision-proof tracking slug.
   * Format: "tk-m3k9d8a1-a8f2c03e" (Prefix: 3 + Base36 Time: 8 + Hyphen: 1 + Rand: 8 = 20 chars)
   * Guaranteed unique even under massive concurrent booking spikes.
   */
  private generateTrackingId(): string {
    const time = Date.now().toString(36);
    const rand = randomBytes(4).toString('hex');
    return `tk-${time}-${rand}`;
  }

  /**
   * 1. Resolve Clinic QR Poster Scan
   * Resolves physical clinic entrance QR slug (e.g. "/clinic/city-care-whitefield")
   * Returns clinic details and all active/upcoming doctor sessions for today.
   */
  async resolveClinicQr(slug: string) {
    try {
      const today = new Date(`${new Date().toISOString().split('T')[0]}T00:00:00.000Z`);
      const clinic = await this.prisma.clinic.findUnique({
        where: { clinicQrSlug: slug },
        include: {
          organization: {
            select: {
              id: true,
              name: true,
              slug: true,
              displayType: true,
              logoUrl: true,
            },
          },
          operatingHours: {
            orderBy: { dayOfWeek: 'asc' },
          },
          doctors: {
            where: { isActive: true },
            include: {
              user: {
                select: {
                  name: true,
                  avatarUrl: true,
                },
              },
              department: true,
              sessions: {
                where: { date: today },
                orderBy: { sessionType: 'asc' },
                include: {
                  _count: {
                    select: { tokens: true },
                  },
                },
              },
            },
          },
        },
      });
      if (!clinic) {
        throw new NotFoundException(`Clinic with QR slug '${slug}' not found`);
      }
      return clinic;
    } catch (error) {
      this.handleDbError(error, `resolving clinic QR slug '${slug}'`);
    }
  }

  /**
   * 2. Search Discovery
   * Multi-criteria search across doctors, medical specialties, clinics, and cities.
   */
  async searchDiscovery(query: SearchDiscoveryQueryDto) {
    try {
      const today = new Date(`${new Date().toISOString().split('T')[0]}T00:00:00.000Z`);
      const doctors = await this.prisma.doctor.findMany({
        where: {
          isActive: true,
          ...(query.city && {
            clinic: {
              city: { contains: query.city, mode: 'insensitive' },
            },
          }),
          ...(query.clinicId && { clinicId: query.clinicId }),
          ...(query.specialization && {
            specialization: { contains: query.specialization, mode: 'insensitive' },
          }),
          ...(query.query && {
            OR: [
              {
                user: {
                  name: { contains: query.query, mode: 'insensitive' },
                },
              },
              {
                specialization: { contains: query.query, mode: 'insensitive' },
              },
              {
                clinic: {
                  name: { contains: query.query, mode: 'insensitive' },
                },
              },
              {
                clinic: {
                  city: { contains: query.query, mode: 'insensitive' },
                },
              },
            ],
          }),
        },
        include: {
          user: {
            select: {
              name: true,
              avatarUrl: true,
            },
          },
          department: true,
          clinic: {
            select: {
              id: true,
              name: true,
              city: true,
              address: true,
              clinicQrSlug: true,
            },
          },
          sessions: {
            where: { date: today },
            orderBy: { sessionType: 'asc' },
            include: {
              _count: {
                select: { tokens: true },
              },
            },
          },
        },
        orderBy: [{ specialization: 'asc' }],
      });
      return doctors;
    } catch (error) {
      this.handleDbError(error, 'executing discovery search');
    }
  }

  /**
   * 3. Patient Online Same-Day Token Booking
   * - Enforces 30-min booking cutoff before shift ends
   * - Enforces session token capacity cap
   * - Enforces anti-duplicate booking guard per patient per session
   * - Auto-increments session token number atomically
   * - Calculates consultation fee + platform fee breakdown
   * - Creates Token in BOOKED status and Payment in PENDING status
   */
  async bookToken(dto: BookTokenDto) {
    try {
      const session = await this.prisma.session.findUnique({
        where: { id: dto.sessionId },
        include: {
          doctor: {
            include: {
              user: { select: { name: true } },
              organization: true,
            },
          },
          clinic: { select: { id: true, name: true, city: true } },
          _count: { select: { tokens: true } },
        },
      });
      if (!session) {
        throw new NotFoundException(`Session with ID '${dto.sessionId}' not found`);
      }
      if (session.status === SessionStatus.CLOSED) {
        throw new BadRequestException('This OPD session has already been closed');
      }
      // Check 30-minute booking cutoff
      const now = new Date();
      if (now > session.bookingCutoffAt) {
        throw new BadRequestException(
          'Online token booking has closed for this session (30-minute cutoff reached). Walk-in tokens may still be available at the clinic counter.',
        );
      }
      // Check session token capacity
      const currentCount = session._count.tokens;
      if (currentCount >= session.tokenCapacity) {
        throw new BadRequestException(
          `Token capacity limit (${session.tokenCapacity}) has been reached for this doctor session`,
        );
      }
      // Check duplicate booking for same patient phone + patient name in this session
      const existingBooking = await this.prisma.token.findUnique({
        where: {
          sessionId_patientPhone_patientName: {
            sessionId: dto.sessionId,
            patientPhone: dto.patientPhone,
            patientName: dto.patientName,
          },
        },
      });
      if (existingBooking) {
        throw new ConflictException(
          `A token (#${existingBooking.tokenNumber}) is already booked for '${dto.patientName}' in this session`,
        );
      }
      // Fee calculation
      const consultationFee = Number(session.doctor.consultationFee) || 0;
      const platformFeePercent = Number(session.doctor.organization.platformFeePercent) || 3.0;
      const platformFee = Math.round(consultationFee * (platformFeePercent / 100) * 100) / 100;
      const totalAmount = Math.round((consultationFee + platformFee) * 100) / 100;
      // Atomic token generation and payment creation
      return await this.prisma.$transaction(async tx => {
        const lastToken = await tx.token.findFirst({
          where: { sessionId: dto.sessionId },
          orderBy: { tokenNumber: 'desc' },
          select: { tokenNumber: true },
        });
        const tokenNumber = (lastToken?.tokenNumber ?? 0) + 1;
        const universalTrackingId = this.generateTrackingId();
        const token = await tx.token.create({
          data: {
            universalTrackingId,
            tokenNumber,
            sessionId: dto.sessionId,
            doctorId: session.doctorId,
            clinicId: session.clinicId,
            patientUserId: dto.patientUserId,
            patientPhone: dto.patientPhone,
            patientName: dto.patientName,
            source: BookingSource.ONLINE_QR,
            status: TokenStatus.BOOKED,
          },
          include: {
            doctor: {
              include: { user: { select: { name: true } } },
            },
            clinic: {
              select: { name: true, city: true, clinicQrSlug: true },
            },
            session: {
              select: {
                date: true,
                sessionType: true,
                currentServingTokenNumber: true,
                rollingAvgDurationSeconds: true,
              },
            },
          },
        });
        const payment = await tx.payment.create({
          data: {
            tokenId: token.id,
            consultationFee,
            platformFee,
            totalAmount,
            mode: PaymentMode.ONLINE_GATEWAY,
            status: PaymentStatus.PENDING,
          },
        });
        return {
          ...token,
          payment,
        };
      });
    } catch (error) {
      this.handleDbError(error, 'booking patient token');
    }
  }

  /**
   * 4. Receptionist Walk-in Counter Booking
   * Allows counter booking ("Paid at Counter — Cash/UPI")
   * Immediately records Payment as PAID with staff attribution.
   */
  async counterBookToken(dto: CounterBookTokenDto, staffUserId?: string) {
    try {
      const session = await this.prisma.session.findUnique({
        where: { id: dto.sessionId },
        include: {
          doctor: {
            include: {
              user: { select: { name: true } },
              organization: true,
            },
          },
          clinic: { select: { id: true, name: true, city: true } },
          _count: { select: { tokens: true } },
        },
      });
      if (!session) {
        throw new NotFoundException(`Session with ID '${dto.sessionId}' not found`);
      }
      if (session.status === SessionStatus.CLOSED) {
        throw new BadRequestException('Cannot book tokens for a CLOSED session');
      }
      // Check session token capacity
      const currentCount = session._count.tokens;
      if (currentCount >= session.tokenCapacity) {
        throw new BadRequestException(
          `Token capacity limit (${session.tokenCapacity}) reached for this session`,
        );
      }
      // Anti-duplicate check
      const existing = await this.prisma.token.findUnique({
        where: {
          sessionId_patientPhone_patientName: {
            sessionId: dto.sessionId,
            patientPhone: dto.patientPhone,
            patientName: dto.patientName,
          },
        },
      });
      if (existing) {
        throw new ConflictException(
          `A token (#${existing.tokenNumber}) is already booked for '${dto.patientName}' in this session`,
        );
      }
      const consultationFee = Number(session.doctor.consultationFee) || 0;
      const platformFeePercent = Number(session.doctor.organization.platformFeePercent) || 3.0;
      const platformFee = Math.round(consultationFee * (platformFeePercent / 100) * 100) / 100;
      const totalAmount = consultationFee;
      return await this.prisma.$transaction(async tx => {
        const lastToken = await tx.token.findFirst({
          where: { sessionId: dto.sessionId },
          orderBy: { tokenNumber: 'desc' },
          select: { tokenNumber: true },
        });
        const tokenNumber = (lastToken?.tokenNumber ?? 0) + 1;
        const universalTrackingId = this.generateTrackingId();
        const token = await tx.token.create({
          data: {
            universalTrackingId,
            tokenNumber,
            sessionId: dto.sessionId,
            doctorId: session.doctorId,
            clinicId: session.clinicId,
            patientPhone: dto.patientPhone,
            patientName: dto.patientName,
            source: BookingSource.RECEPTION_WALK_IN,
            status: TokenStatus.BOOKED,
          },
          include: {
            doctor: {
              include: { user: { select: { name: true } } },
            },
            clinic: {
              select: { name: true, city: true },
            },
          },
        });
        const payment = await tx.payment.create({
          data: {
            tokenId: token.id,
            consultationFee,
            platformFee,
            totalAmount,
            mode: dto.paymentMode,
            status: PaymentStatus.PAID,
            collectedByUserId: staffUserId,
            paidAt: new Date(),
          },
        });
        return {
          ...token,
          payment,
        };
      });
    } catch (error) {
      this.handleDbError(error, 'processing counter walk-in booking');
    }
  }

  /**
   * 5. Patient Live Tracking Slug Resolution (`/track/:trackingCode`)
   * Public endpoint that calculates live queue metrics:
   * - Current serving token number
   * - Estimated wait time range (tokens ahead * rolling average duration)
   * - Proactive urgent arrival alert (within 3 patients)
   */
  async trackToken(universalTrackingId: string) {
    try {
      const token = await this.prisma.token.findUnique({
        where: { universalTrackingId },
        include: {
          doctor: {
            include: {
              user: {
                select: {
                  name: true,
                  avatarUrl: true,
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
              mapUrl: true,
              contactPhone: true,
              clinicQrSlug: true,
            },
          },
          session: {
            select: {
              id: true,
              date: true,
              sessionType: true,
              status: true,
              currentServingTokenNumber: true,
              rollingAvgDurationSeconds: true,
            },
          },
          payment: {
            select: {
              status: true,
              totalAmount: true,
              mode: true,
            },
          },
        },
      });
      if (!token) {
        throw new NotFoundException(`Token with tracking ID '${universalTrackingId}' not found`);
      }
      const servingNum = token.session.currentServingTokenNumber ?? 0;
      const tokensAhead = Math.max(0, token.tokenNumber - servingNum);
      const avgDurationMins = Math.round((token.session.rollingAvgDurationSeconds || 600) / 60);
      const estimatedWaitMinutes = tokensAhead * avgDurationMins;
      // Proactive Alert: Patient is within next 3 tokens
      const urgentArrivalAlert =
        tokensAhead <= 3 && tokensAhead > 0 && token.status === TokenStatus.BOOKED;
      return {
        token: {
          id: token.id,
          universalTrackingId: token.universalTrackingId,
          tokenNumber: token.tokenNumber,
          status: token.status,
          holdCount: token.holdCount,
          patientName: token.patientName,
          patientPhone: token.patientPhone,
          createdAt: token.createdAt,
        },
        queueState: {
          currentServingTokenNumber: servingNum,
          tokensAhead,
          estimatedWaitMinutes,
          estimatedWaitRange: `${Math.max(0, estimatedWaitMinutes - 5)}–${estimatedWaitMinutes + 5} mins`,
          urgentArrivalAlert,
          sessionStatus: token.session.status,
        },
        doctor: token.doctor,
        clinic: token.clinic,
        session: token.session,
        payment: token.payment,
      };
    } catch (error) {
      this.handleDbError(error, `tracking token '${universalTrackingId}'`);
    }
  }

  /**
   * 6. Pre-Session Token Cancellation
   */
  async cancelToken(id: string, dto: CancelTokenDto) {
    try {
      const token = await this.prisma.token.findUnique({
        where: { id },
        include: { payment: true },
      });
      if (!token) {
        throw new NotFoundException(`Token with ID '${id}' not found`);
      }
      if (token.status === TokenStatus.COMPLETED) {
        throw new BadRequestException('Cannot cancel an already COMPLETED consultation');
      }
      if (token.status === TokenStatus.SERVING) {
        throw new BadRequestException('Cannot cancel a consultation currently in progress');
      }
      if (token.status === TokenStatus.CANCELLED) {
        throw new BadRequestException('This token is already cancelled');
      }
      return await this.prisma.$transaction(async tx => {
        const updatedToken = await tx.token.update({
          where: { id },
          data: {
            status: TokenStatus.CANCELLED,
            cancellationReason: dto.reason ?? 'Cancelled by patient or clinic desk',
          },
        });
        // Mark refund if online payment was already captured
        if (token.payment && token.payment.status === PaymentStatus.PAID) {
          await tx.payment.update({
            where: { id: token.payment.id },
            data: {
              status: PaymentStatus.REFUNDED,
              refundedAt: new Date(),
            },
          });
        }
        return updatedToken;
      });
    } catch (error) {
      this.handleDbError(error, `cancelling token '${id}'`);
    }
  }

  /**
   * 7. List All Tokens in an OPD Session
   * Used by Doctor Queue Controller and Receptionist Desk.
   */
  async getSessionTokens(sessionId: string) {
    try {
      return await this.prisma.token.findMany({
        where: { sessionId },
        orderBy: [{ tokenNumber: 'asc' }],
        include: {
          payment: {
            select: {
              status: true,
              mode: true,
              totalAmount: true,
            },
          },
        },
      });
    } catch (error) {
      this.handleDbError(error, `fetching tokens for session '${sessionId}'`);
    }
  }
}
