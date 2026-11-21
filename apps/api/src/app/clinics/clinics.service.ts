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
import { CreateClinicDto, CreateClinicHolidayDto, CreateOrganizationDto } from './dto/clinic.dto';

@Injectable()
export class ClinicsService {
  private readonly logger = new Logger(ClinicsService.name);
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Helper to intercept unexpected database outages / connection failures
   * while letting business exceptions (400, 404, 409) pass through cleanly.
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
   * 1. Register a new Organization (Solo Clinic, Polyclinic, Hospital)
   */
  async createOrganization(dto: CreateOrganizationDto) {
    try {
      const existing = await this.prisma.organization.findUnique({
        where: { slug: dto.slug },
      });
      if (existing) {
        throw new ConflictException(`Organization with slug '${dto.slug}' already exists`);
      }
      if (dto.referralCode) {
        const partner = await this.prisma.onboardingPartner.findUnique({
          where: { referralCode: dto.referralCode },
        });
        if (!partner) {
          throw new BadRequestException(`Invalid agent referral code: '${dto.referralCode}'`);
        }
      }
      return await this.prisma.organization.create({
        data: {
          name: dto.name,
          slug: dto.slug,
          displayType: dto.displayType,
          contactPhone: dto.contactPhone,
          contactEmail: dto.contactEmail,
          platformFeePercent: dto.platformFeePercent ?? 3.0,
          referralCode: dto.referralCode,
        },
      });
    } catch (error) {
      this.handleDbError(error, 'organization registration');
    }
  }

  /**
   * 2. Retrieve Organization by ID with its Clinics
   */
  async getOrganization(id: string) {
    try {
      const organization = await this.prisma.organization.findUnique({
        where: { id },
        include: {
          clinics: {
            select: {
              id: true,
              name: true,
              clinicQrSlug: true,
              city: true,
              address: true,
              isActive: true,
            },
          },
        },
      });
      if (!organization) {
        throw new NotFoundException(`Organization with ID '${id}' not found`);
      }
      return organization;
    } catch (error) {
      this.handleDbError(error, `fetching organization '${id}'`);
    }
  }

  /**
   * 3. Register a physical Clinic branch with unique QR slug and default hours
   */
  async createClinic(dto: CreateClinicDto) {
    try {
      const org = await this.prisma.organization.findUnique({
        where: { id: dto.organizationId },
      });
      if (!org) {
        throw new NotFoundException(`Organization with ID '${dto.organizationId}' not found`);
      }
      const existingSlug = await this.prisma.clinic.findUnique({
        where: { clinicQrSlug: dto.clinicQrSlug },
      });
      if (existingSlug) {
        throw new ConflictException(`Clinic with QR slug '${dto.clinicQrSlug}' already exists`);
      }
      // Create clinic branch with default Monday-Saturday operating hours
      return await this.prisma.clinic.create({
        data: {
          organizationId: dto.organizationId,
          name: dto.name,
          clinicQrSlug: dto.clinicQrSlug,
          city: dto.city,
          address: dto.address,
          latitude: dto.latitude,
          longitude: dto.longitude,
          contactPhone: dto.contactPhone,
          operatingHours: {
            create: [
              { dayOfWeek: 0, isOpen: false, openTime: '09:00', closeTime: '13:00' }, // Sunday
              { dayOfWeek: 1, isOpen: true, openTime: '08:00', closeTime: '21:30' }, // Monday
              { dayOfWeek: 2, isOpen: true, openTime: '08:00', closeTime: '21:30' }, // Tuesday
              { dayOfWeek: 3, isOpen: true, openTime: '08:00', closeTime: '21:30' }, // Wednesday
              { dayOfWeek: 4, isOpen: true, openTime: '08:00', closeTime: '21:30' }, // Thursday
              { dayOfWeek: 5, isOpen: true, openTime: '08:00', closeTime: '21:30' }, // Friday
              { dayOfWeek: 6, isOpen: true, openTime: '08:00', closeTime: '21:30' }, // Saturday
            ],
          },
        },
        include: {
          operatingHours: { orderBy: { dayOfWeek: 'asc' } },
        },
      });
    } catch (error) {
      this.handleDbError(error, 'clinic creation');
    }
  }

  /**
   * 4. Retrieve Clinic Branch by ID with Operating Hours
   */
  async getClinic(id: string) {
    try {
      const clinic = await this.prisma.clinic.findUnique({
        where: { id },
        include: {
          organization: {
            select: {
              id: true,
              name: true,
              slug: true,
              displayType: true,
              platformFeePercent: true,
            },
          },
          operatingHours: { orderBy: { dayOfWeek: 'asc' } },
        },
      });
      if (!clinic) {
        throw new NotFoundException(`Clinic with ID '${id}' not found`);
      }
      return clinic;
    } catch (error) {
      this.handleDbError(error, `fetching clinic '${id}'`);
    }
  }

  /**
   * 5. Declare Facility Holiday Closure
   */
  async createHoliday(clinicId: string, dto: CreateClinicHolidayDto) {
    try {
      const clinic = await this.prisma.clinic.findUnique({
        where: { id: clinicId },
      });
      if (!clinic) {
        throw new NotFoundException(`Clinic with ID '${clinicId}' not found`);
      }
      const holidayDate = new Date(`${dto.date}T00:00:00.000Z`);
      const existing = await this.prisma.clinicHoliday.findFirst({
        where: {
          clinicId,
          date: holidayDate,
        },
      });
      if (existing) {
        throw new ConflictException(
          `A holiday has already been declared for clinic '${clinicId}' on '${dto.date}'`,
        );
      }
      return await this.prisma.clinicHoliday.create({
        data: {
          clinicId,
          date: holidayDate,
          title: dto.reason,
        },
      });
    } catch (error) {
      this.handleDbError(error, `declaring holiday for clinic '${clinicId}'`);
    }
  }

  /**
   * 6. List Upcoming Facility Holidays
   */
  async getHolidays(clinicId: string, fromDate?: string) {
    try {
      const clinic = await this.prisma.clinic.findUnique({
        where: { id: clinicId },
      });
      if (!clinic) {
        throw new NotFoundException(`Clinic with ID '${clinicId}' not found`);
      }
      const start = fromDate ? new Date(`${fromDate}T00:00:00.000Z`) : new Date();
      return await this.prisma.clinicHoliday.findMany({
        where: {
          clinicId,
          date: { gte: start },
        },
        orderBy: { date: 'asc' },
      });
    } catch (error) {
      this.handleDbError(error, `fetching holidays for clinic '${clinicId}'`);
    }
  }
}
