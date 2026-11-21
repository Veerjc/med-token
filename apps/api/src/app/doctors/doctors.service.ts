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
import { CreateDoctorDto, CreateDoctorHolidayDto, SetDoctorScheduleDto } from './dto/doctor.dto';
import { UserRole } from '@medical-proj/shared-models';

@Injectable()
export class DoctorsService {
  private readonly logger = new Logger(DoctorsService.name);
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Database Failover Interceptor
   * Passes business exceptions (400, 404, 409) cleanly while converting
   * infrastructure/connection errors into HTTP 503 Service Unavailable.
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
   * 1. Create a Doctor Profile & Link/Promote User Account
   * - Verifies User exists and doesn't already have a Doctor profile
   * - Verifies Organization & Clinic exist and match hierarchy
   * - Verifies Department (if provided) belongs to Organization
   * - Enforces unique doctorQrSlug
   * - Runs in a Prisma $transaction: sets User.role = DOCTOR and inserts Doctor record
   */

  async createDoctor(dto: CreateDoctorDto) {
    try {
      // 1. Verify User exists
      const user = await this.prisma.user.findUnique({
        where: { id: dto.userId },
      });
      if (!user) {
        throw new NotFoundException(`User with ID '${dto.userId}' not found`);
      }
      // 2. Check if User already has a Doctor profile
      const existingDoctorUser = await this.prisma.doctor.findUnique({
        where: { userId: dto.userId },
      });
      if (existingDoctorUser) {
        throw new ConflictException(
          `User '${dto.userId}' is already assigned to a Doctor profile (${existingDoctorUser.id})`,
        );
      }
      // 3. Verify Organization exists
      const org = await this.prisma.organization.findUnique({
        where: { id: dto.organizationId },
      });
      if (!org) {
        throw new NotFoundException(`Organization with ID '${dto.organizationId}' not found`);
      }
      // 4. Verify Clinic exists & belongs to Organization
      const clinic = await this.prisma.clinic.findUnique({
        where: { id: dto.clinicId },
      });
      if (!clinic) {
        throw new NotFoundException(`Clinic with ID '${dto.clinicId}' not found`);
      }
      if (clinic.organizationId !== dto.organizationId) {
        throw new BadRequestException(
          `Clinic '${dto.clinicId}' does not belong to organization '${dto.organizationId}'`,
        );
      }
      // 5. Verify Department (if provided)
      if (dto.departmentId) {
        const dept = await this.prisma.department.findUnique({
          where: { id: dto.departmentId },
        });
        if (!dept) {
          throw new NotFoundException(`Department with ID '${dto.departmentId}' not found`);
        }
        if (dept.organizationId !== dto.organizationId) {
          throw new BadRequestException(
            `Department '${dto.departmentId}' does not belong to organization '${dto.organizationId}'`,
          );
        }
      }
      // 6. Check unique QR slug collision
      const existingSlug = await this.prisma.doctor.findUnique({
        where: { doctorQrSlug: dto.doctorQrSlug },
      });
      if (existingSlug) {
        throw new ConflictException(`Doctor QR slug '${dto.doctorQrSlug}' is already taken`);
      }
      // 7. Atomic transaction: promote User role & create Doctor entity
      return await this.prisma.$transaction(async tx => {
        await tx.user.update({
          where: { id: dto.userId },
          data: {
            role: UserRole.DOCTOR,
            organizationId: dto.organizationId,
            clinicId: dto.clinicId,
          },
        });
        return await tx.doctor.create({
          data: {
            userId: dto.userId,
            organizationId: dto.organizationId,
            clinicId: dto.clinicId,
            departmentId: dto.departmentId,
            specialization: dto.specialization,
            qualifications: dto.qualifications,
            registrationNumber: dto.registrationNumber,
            experienceYears: dto.experienceYears,
            languages: dto.languages ?? [],
            about: dto.about,
            avatarUrl: dto.avatarUrl,
            consultationFee: dto.consultationFee ?? 0.0,
            defaultSlotDurationMins: dto.defaultSlotDurationMins ?? 10,
            defaultTokenCapacity: dto.defaultTokenCapacity ?? 30,
            doctorQrSlug: dto.doctorQrSlug,
          },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                phone: true,
                email: true,
                role: true,
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
            organization: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
            department: true,
          },
        });
      });
    } catch (error) {
      this.handleDbError(error, 'creating doctor profile');
    }
  }

  /**
   * 2. Retrieve Doctor Details by ID
   * Includes User contact info, Clinic, Organization, Department,
   * active Weekly Shifts (`DoctorScheduleShift`), and upcoming Leaves (`DoctorHoliday`).
   */

  async getDoctor(id: string) {
    try {
      const doctor = await this.prisma.doctor.findUnique({
        where: { id },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              phone: true,
              email: true,
              avatarUrl: true,
              role: true,
            },
          },
          clinic: {
            select: {
              id: true,
              name: true,
              city: true,
              address: true,
              clinicQrSlug: true,
              contactPhone: true,
            },
          },
          organization: {
            select: {
              id: true,
              name: true,
              slug: true,
              displayType: true,
            },
          },
          department: true,
          schedules: {
            where: { isActive: true },
            orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
          },
          holidays: {
            where: {
              date: {
                gte: new Date(new Date().setHours(0, 0, 0, 0)),
              },
            },
            orderBy: { date: 'asc' },
          },
        },
      });
      if (!doctor) {
        throw new NotFoundException(`Doctor with ID '${id}' not found`);
      }
      return doctor;
    } catch (error) {
      this.handleDbError(error, `fetching doctor '${id}'`);
    }
  }

  /**
   * 3. Retrieve Doctor Details by Doctor QR Slug
   * Resolves physical QR scans (e.g. `/dr/dr-sarah-chen`) for patient booking discovery.
   */
  async getDoctorBySlug(slug: string) {
    try {
      const doctor = await this.prisma.doctor.findUnique({
        where: { doctorQrSlug: slug },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              phone: true,
              avatarUrl: true,
            },
          },
          clinic: {
            select: {
              id: true,
              name: true,
              city: true,
              address: true,
              clinicQrSlug: true,
            },
          },
          organization: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          department: true,
          schedules: {
            where: { isActive: true },
            orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
          },
        },
      });
      if (!doctor) {
        throw new NotFoundException(`Doctor with QR slug '${slug}' not found`);
      }
      return doctor;
    } catch (error) {
      this.handleDbError(error, `resolving doctor slug '${slug}'`);
    }
  }

  /**
   * 4. Configure Weekly Shift Schedules (`DoctorScheduleShift`)
   * - Validates shift chronometry (startTime < endTime)
   * - Prevents duplicate shift types on the same day in the input
   * - Atomically replaces previous shifts in a Prisma transaction
   */

  async setDoctorSchedules(doctorId: string, dto: SetDoctorScheduleDto) {
    try {
      const doctor = await this.prisma.doctor.findUnique({
        where: { id: doctorId },
      });
      if (!doctor) {
        throw new NotFoundException(`Doctor with ID '${doctorId}' not found`);
      }
      // Validate shift constraints
      const seenShifts = new Set<string>();
      for (const shift of dto.shifts) {
        if (shift.startTime >= shift.endTime) {
          throw new BadRequestException(
            `Invalid shift hours: startTime (${shift.startTime}) must precede endTime (${shift.endTime}) for dayOfWeek ${shift.dayOfWeek}`,
          );
        }
        const key = `${shift.dayOfWeek}-${shift.sessionType}`;
        if (seenShifts.has(key)) {
          throw new BadRequestException(
            `Duplicate shift entry: dayOfWeek ${shift.dayOfWeek} already has a ${shift.sessionType} shift in this configuration`,
          );
        }
        seenShifts.add(key);
      }
      // Atomic replace
      return await this.prisma.$transaction(async tx => {
        await tx.doctorScheduleShift.deleteMany({
          where: { doctorId },
        });
        if (dto.shifts.length === 0) {
          return [];
        }
        return await Promise.all(
          dto.shifts.map(shift =>
            tx.doctorScheduleShift.create({
              data: {
                doctorId,
                dayOfWeek: shift.dayOfWeek,
                sessionType: shift.sessionType,
                startTime: shift.startTime,
                endTime: shift.endTime,
                tokenCapacity: shift.tokenCapacity ?? doctor.defaultTokenCapacity ?? 30,
                isActive: true,
              },
            }),
          ),
        );
      });
    } catch (error) {
      this.handleDbError(error, `updating schedules for doctor '${doctorId}'`);
    }
  }

  /**
   * 5. Record a Doctor Leave / Holiday (`DoctorHoliday`)
   * - Supports Full-Day Leave (sessionType: null/undefined)
   * - Supports Half-Day Leave (sessionType: MORNING / AFTERNOON / EVENING / NIGHT)
   * - Prevents duplicate leaves on the same day/session
   */

  async createDoctorHoliday(doctorId: string, dto: CreateDoctorHolidayDto) {
    try {
      const doctor = await this.prisma.doctor.findUnique({
        where: { id: doctorId },
      });
      if (!doctor) {
        throw new NotFoundException(`Doctor with ID '${doctorId}' not found`);
      }
      const holidayDate = new Date(`${dto.date}T00:00:00.000Z`);
      // Check if already on full-day leave
      const existingFullDay = await this.prisma.doctorHoliday.findFirst({
        where: {
          doctorId,
          date: holidayDate,
          sessionType: null,
        },
      });
      if (existingFullDay) {
        throw new ConflictException(
          `Doctor is already scheduled for full-day leave on ${dto.date}`,
        );
      }
      // Check if exact leave slot already booked
      const existingSlot = await this.prisma.doctorHoliday.findFirst({
        where: {
          doctorId,
          date: holidayDate,
          sessionType: dto.sessionType ?? null,
        },
      });
      if (existingSlot) {
        throw new ConflictException(
          `Doctor holiday on date '${dto.date}'${
            dto.sessionType ? ` (${dto.sessionType} session)` : ' (Full-day)'
          } already exists`,
        );
      }
      return await this.prisma.doctorHoliday.create({
        data: {
          doctorId,
          date: holidayDate,
          sessionType: dto.sessionType,
          reason: dto.reason,
        },
      });
    } catch (error) {
      this.handleDbError(error, `creating holiday for doctor '${doctorId}'`);
    }
  }

  /**
   * 6. List Upcoming Holidays / Leaves for a Doctor
   */
  async getDoctorHolidays(doctorId: string, fromDate?: string) {
    try {
      const doctor = await this.prisma.doctor.findUnique({
        where: { id: doctorId },
      });
      if (!doctor) {
        throw new NotFoundException(`Doctor with ID '${doctorId}' not found`);
      }
      const dateFilter = fromDate
        ? { gte: new Date(`${fromDate}T00:00:00.000Z`) }
        : { gte: new Date(new Date().setHours(0, 0, 0, 0)) };
      return await this.prisma.doctorHoliday.findMany({
        where: {
          doctorId,
          date: dateFilter,
        },
        orderBy: [{ date: 'asc' }],
      });
    } catch (error) {
      this.handleDbError(error, `listing holidays for doctor '${doctorId}'`);
    }
  }

  /**
   * 7. Cancel / Delete a Scheduled Holiday
   */
  async deleteDoctorHoliday(doctorId: string, holidayId: string) {
    try {
      const holiday = await this.prisma.doctorHoliday.findUnique({
        where: { id: holidayId },
      });
      if (!holiday || holiday.doctorId !== doctorId) {
        throw new NotFoundException(
          `Holiday with ID '${holidayId}' not found for doctor '${doctorId}'`,
        );
      }
      return await this.prisma.doctorHoliday.delete({
        where: { id: holidayId },
      });
    } catch (error) {
      this.handleDbError(error, `deleting holiday '${holidayId}'`);
    }
  }
}

/**
 * 
 * Transactional Integrity ($transaction):
In createDoctor, promoting the user account to role = UserRole.DOCTOR and creating the Doctor record occur inside a single atomic database transaction. If either step fails, no orphaned half-configured records are left behind.
In setDoctorSchedules, the previous weekly shift configuration is deleted and the new schedule is inserted in one transaction, ensuring a clean atomic sync without race conditions.
Multi-Tenant Hierarchy Validation:
createDoctor asserts that the clinicId strictly belongs to the organizationId, and that optional departmentId also belongs to that same organization. Cross-tenant pollution is rejected at the service level with HTTP 400 Bad Request.
Database Outage Resilience (handleDbError):
Retains standard NestJS HTTP business exceptions (400, 404, 409), while catching raw Prisma connection dropouts (P1001, ECONNREFUSED) and converting them to structured HTTP 503 Service Unavailable so the server never crashes.
Intelligent Leave Validation:
Distinguishes between Full-Day Leaves (sessionType: null) and Half-Day Leaves (sessionType: MORNING | AFTERNOON | EVENING | NIGHT). If a doctor already has full-day leave booked on a date, subsequent half-day leaves on that date are rejected with HTTP 409 Conflict.
 * 
*/
