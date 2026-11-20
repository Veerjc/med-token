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
import {
  GetActiveSessionsQueryDto,
  OpenSessionDto,
  UpdateSessionCapacityDto,
  UpdateSessionStatusDto,
} from './dto/session.dto';
import { SessionStatus } from '@medical-proj/shared-models';

@Injectable()
export class SessionService {
  private readonly logger = new Logger(SessionService.name);
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Database Failover Interceptor
   * Converts unexpected infrastructure/network errors into HTTP 503
   * while allowing business exceptions (400, 404, 409) to pass through.
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
   * 1. Initialize or Open an OPD Session for a Doctor & Shift
   * - Verifies doctor and clinic exist
   * - Verifies doctor is NOT on leave (full-day or shift-specific)
   * - Prevents duplicate session creation for the same (doctorId, date, sessionType)
   * - Calculates booking cutoff (30 minutes prior to scheduled shift close)
   * - Adopts doctor's default slot duration baseline (rolling average duration)
   */
  async openSession(dto: OpenSessionDto) {
    try {
      // 1. Verify Doctor exists with active shift schedules
      const doctor = await this.prisma.doctor.findUnique({
        where: { id: dto.doctorId },
        include: { schedules: true },
      });
      if (!doctor) {
        throw new NotFoundException(`Doctor with ID '${dto.doctorId}' not found`);
      }
      // 2. Verify Clinic exists
      const clinic = await this.prisma.clinic.findUnique({
        where: { id: dto.clinicId },
      });
      if (!clinic) {
        throw new NotFoundException(`Clinic with ID '${dto.clinicId}' not found`);
      }
      const sessionDate = new Date(`${dto.date}T00:00:00.000Z`);
      // 3. Verify Doctor is NOT on leave for this date/shift
      const holiday = await this.prisma.doctorHoliday.findFirst({
        where: {
          doctorId: dto.doctorId,
          date: sessionDate,
          OR: [{ sessionType: null }, { sessionType: dto.sessionType }],
        },
      });
      if (holiday) {
        throw new ConflictException(
          `Doctor is on scheduled leave on ${dto.date}${
            holiday.sessionType ? ` (${holiday.sessionType} session)` : ' (Full-day)'
          }: ${holiday.reason || 'Leave recorded'}`,
        );
      }
      // 4. Check for duplicate session
      const existingSession = await this.prisma.session.findUnique({
        where: {
          doctorId_date_sessionType: {
            doctorId: dto.doctorId,
            date: sessionDate,
            sessionType: dto.sessionType,
          },
        },
      });
      if (existingSession) {
        throw new ConflictException(
          `An OPD session already exists for this doctor on ${dto.date} (${dto.sessionType} shift)`,
        );
      }
      // 5. Compute day-of-week & locate matching shift schedule
      const dayOfWeek = sessionDate.getUTCDay(); // 0 = Sunday ... 6 = Saturday
      const matchedShift = doctor.schedules.find(
        s => s.dayOfWeek === dayOfWeek && s.sessionType === dto.sessionType && s.isActive,
      );
      // 6. Determine Capacity: DTO override -> Shift capacity -> Doctor default -> 30
      const tokenCapacity =
        dto.tokenCapacity ?? matchedShift?.tokenCapacity ?? doctor.defaultTokenCapacity ?? 30;
      // 7. Calculate 30-minute Booking Cutoff Timestamp
      let bookingCutoffAt: Date;
      if (dto.bookingCutoffAt) {
        bookingCutoffAt = new Date(dto.bookingCutoffAt);
      } else if (matchedShift?.endTime) {
        const [hours, minutes] = matchedShift.endTime.split(':').map(Number);
        bookingCutoffAt = new Date(sessionDate);
        bookingCutoffAt.setUTCHours(hours, minutes - 30, 0, 0);
      } else {
        // Fallback default: 20:30 UTC of that date
        bookingCutoffAt = new Date(sessionDate);
        bookingCutoffAt.setUTCHours(20, 30, 0, 0);
      }
      return await this.prisma.session.create({
        data: {
          doctorId: dto.doctorId,
          clinicId: dto.clinicId,
          date: sessionDate,
          sessionType: dto.sessionType,
          status: SessionStatus.NOT_ARRIVED,
          tokenCapacity,
          bookingCutoffAt,
          rollingAvgDurationSeconds: doctor.defaultSlotDurationMins * 60 || 600,
        },
        include: {
          doctor: {
            include: {
              user: {
                select: {
                  name: true,
                  phone: true,
                  avatarUrl: true,
                },
              },
            },
          },
          clinic: {
            select: {
              name: true,
              city: true,
              clinicQrSlug: true,
            },
          },
          _count: {
            select: { tokens: true },
          },
        },
      });
    } catch (error) {
      this.handleDbError(error, 'opening OPD session');
    }
  }

  /**
   * 2. Retrieve a Session by ID with Live Token Count & Details
   */
  async getSession(id: string) {
    try {
      const session = await this.prisma.session.findUnique({
        where: { id },
        include: {
          doctor: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  phone: true,
                  email: true,
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
              clinicQrSlug: true,
              contactPhone: true,
            },
          },
          _count: {
            select: { tokens: true },
          },
        },
      });
      if (!session) {
        throw new NotFoundException(`Session with ID '${id}' not found`);
      }
      return session;
    } catch (error) {
      this.handleDbError(error, `fetching session '${id}'`);
    }
  }

  /**
   * 3. Toggle Doctor Operational Status
   * (NOT_ARRIVED -> ARRIVED -> OPD_STARTED -> LUNCH_BREAK -> ON_ROUNDS -> EMERGENCY_DUTY -> CLOSED)
   */
  async updateSessionStatus(id: string, dto: UpdateSessionStatusDto) {
    try {
      const session = await this.prisma.session.findUnique({
        where: { id },
      });
      if (!session) {
        throw new NotFoundException(`Session with ID '${id}' not found`);
      }
      if (session.status === SessionStatus.CLOSED && dto.status !== SessionStatus.CLOSED) {
        throw new BadRequestException('Cannot modify the status of an already CLOSED session');
      }
      return await this.prisma.session.update({
        where: { id },
        data: {
          status: dto.status,
        },
        include: {
          doctor: {
            include: {
              user: {
                select: { name: true, phone: true },
              },
            },
          },
          clinic: {
            select: { name: true, city: true },
          },
        },
      });
    } catch (error) {
      this.handleDbError(error, `updating status for session '${id}'`);
    }
  }

  /**
   * 4. Dynamic Token Capacity Override
   * Allows increasing or throttling token issuance on the fly during active OPD.
   * Safety Rule: Cannot reduce capacity below the number of already-issued tokens.
   */
  async updateSessionCapacity(id: string, dto: UpdateSessionCapacityDto) {
    try {
      const session = await this.prisma.session.findUnique({
        where: { id },
        include: {
          _count: {
            select: { tokens: true },
          },
        },
      });
      if (!session) {
        throw new NotFoundException(`Session with ID '${id}' not found`);
      }
      if (session.status === SessionStatus.CLOSED) {
        throw new BadRequestException('Cannot adjust capacity of a CLOSED session');
      }
      const issuedTokensCount = session._count.tokens;
      if (dto.tokenCapacity < issuedTokensCount) {
        throw new BadRequestException(
          `Cannot reduce token capacity to ${dto.tokenCapacity}: ${issuedTokensCount} tokens have already been issued for this session`,
        );
      }
      return await this.prisma.session.update({
        where: { id },
        data: {
          tokenCapacity: dto.tokenCapacity,
        },
        include: {
          doctor: {
            include: {
              user: {
                select: { name: true },
              },
            },
          },
          _count: {
            select: { tokens: true },
          },
        },
      });
    } catch (error) {
      this.handleDbError(error, `updating capacity for session '${id}'`);
    }
  }

  /**
   * 5. Query Active OPD Sessions
   * Filterable by clinic, doctor, date (defaults to today), and shift type.
   */
  async getActiveSessions(query: GetActiveSessionsQueryDto) {
    try {
      const targetDate = query.date
        ? new Date(`${query.date}T00:00:00.000Z`)
        : new Date(`${new Date().toISOString().split('T')[0]}T00:00:00.000Z`);
      return await this.prisma.session.findMany({
        where: {
          ...(query.clinicId && { clinicId: query.clinicId }),
          ...(query.doctorId && { doctorId: query.doctorId }),
          ...(query.sessionType && { sessionType: query.sessionType }),
          date: targetDate,
        },
        include: {
          doctor: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  phone: true,
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
              clinicQrSlug: true,
            },
          },
          _count: {
            select: { tokens: true },
          },
        },
        orderBy: [{ sessionType: 'asc' }],
      });
    } catch (error) {
      this.handleDbError(error, 'fetching active sessions');
    }
  }

  /**
   * 6. One-Click Daily OPD Session Generator
   * Scans all active doctors in a clinic, checks their weekly timetable for today,
   * excludes any on scheduled leave, and opens today's sessions in batch.
   */
  async autoOpenDailySessions(clinicId: string, dateStr?: string) {
    try {
      const targetDateStr = dateStr ?? new Date().toISOString().split('T')[0];
      const sessionDate = new Date(`${targetDateStr}T00:00:00.000Z`);
      const dayOfWeek = sessionDate.getUTCDay();
      // Find all active doctors in this clinic with their shift schedule for today
      const doctors = await this.prisma.doctor.findMany({
        where: {
          clinicId,
          isActive: true,
        },
        include: {
          schedules: {
            where: {
              dayOfWeek,
              isActive: true,
            },
          },
          holidays: {
            where: {
              date: sessionDate,
            },
          },
        },
      });
      const openedSessions = [];
      for (const doctor of doctors) {
        // If doctor has full-day leave, skip all shifts
        const hasFullDayLeave = doctor.holidays.some(h => h.sessionType === null);
        if (hasFullDayLeave) continue;
        for (const shift of doctor.schedules) {
          // Check if doctor has half-day leave for this shift
          const hasShiftLeave = doctor.holidays.some(h => h.sessionType === shift.sessionType);
          if (hasShiftLeave) continue;
          // Check if session already opened
          const existing = await this.prisma.session.findUnique({
            where: {
              doctorId_date_sessionType: {
                doctorId: doctor.id,
                date: sessionDate,
                sessionType: shift.sessionType,
              },
            },
          });
          if (existing) {
            openedSessions.push(existing);
            continue;
          }
          // Calculate 30-min cutoff
          const [hours, minutes] = shift.endTime.split(':').map(Number);
          const bookingCutoffAt = new Date(sessionDate);
          bookingCutoffAt.setUTCHours(hours, minutes - 30, 0, 0);
          const newSession = await this.prisma.session.create({
            data: {
              doctorId: doctor.id,
              clinicId,
              date: sessionDate,
              sessionType: shift.sessionType,
              status: SessionStatus.NOT_ARRIVED,
              tokenCapacity: shift.tokenCapacity ?? doctor.defaultTokenCapacity ?? 30,
              bookingCutoffAt,
              rollingAvgDurationSeconds: doctor.defaultSlotDurationMins * 60 || 600,
            },
          });
          openedSessions.push(newSession);
        }
      }
      return openedSessions;
    } catch (error) {
      this.handleDbError(error, `batch generating daily sessions for clinic '${clinicId}'`);
    }
  }
}

/**
 * Key Architectural Rationale
Leave Conflict Enforcement:
openSession checks DoctorHoliday before opening any session. If the doctor has a full-day leave or a leave matching the requested sessionType, it halts immediately with HTTP 409 Conflict and includes the leave reason.
Dynamic 30-Minute Booking Cutoff:
Automatically computes bookingCutoffAt as exactly 30 minutes prior to shift.endTime. This directly satisfies the business requirement from TECH_SPEC.md and context.md that online token generation stops 30 minutes before the doctor's shift concludes.
Capacity Invariant Protection:
In updateSessionCapacity, if a clinic receptionist or doctor attempts to decrease tokenCapacity below the number of tokens already issued for that session (issuedTokensCount), the operation is rejected with HTTP 400 Bad Request to protect patients who already hold active tokens.
Batch Daily OPD Generator (autoOpenDailySessions):
Enables receptionists or morning cron jobs to initialize all OPD doctors' sessions for today with a single call, respecting each doctor's weekly shift timetable and leaves.
 * 
*/
