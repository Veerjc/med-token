import {
  BadRequestException,
  HttpException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { TokenStatus } from '@medical-proj/shared-models';
import { PrismaService } from '../prisma/prisma.service';
import { UpsertConsultationNoteDto } from './dto/consultation.dto';

@Injectable()
export class ConsultationsService {
  private readonly logger = new Logger(ConsultationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  private handleDbError(error: unknown, action: string): never {
    if (error instanceof HttpException) {
      throw error;
    }
    this.logger.error(`Database connection error during ${action}: ${(error as Error).message}`);
    throw new ServiceUnavailableException(
      'Database service is temporarily unreachable. Please ensure PostgreSQL is running and retry.',
    );
  }

  async upsertConsultationNote(tokenId: string, dto: UpsertConsultationNoteDto) {
    try {
      const token = await this.prisma.token.findUnique({
        where: { id: tokenId },
        include: {
          doctor: true,
        },
      });

      if (!token) {
        throw new NotFoundException(`Token with ID '${tokenId}' not found`);
      }

      if (token.status === TokenStatus.CANCELLED || token.status === TokenStatus.NO_SHOW) {
        throw new BadRequestException(`Cannot record clinical notes for a ${token.status} token`);
      }

      const followUpDate = dto.followUpDate ? new Date(`${dto.followUpDate}T00:00:00.000Z`) : null;

      return await this.prisma.consultationNote.upsert({
        where: { tokenId },
        create: {
          tokenId,
          doctorId: token.doctorId,
          diagnosis: dto.diagnosis,
          prescriptions: dto.prescriptions
            ? JSON.parse(JSON.stringify(dto.prescriptions))
            : undefined,
          recommendedTests: dto.recommendedTests ?? [],
          treatmentInstructions: dto.treatmentInstructions,
          followUpDate,
        },
        update: {
          diagnosis: dto.diagnosis,
          prescriptions: dto.prescriptions
            ? JSON.parse(JSON.stringify(dto.prescriptions))
            : undefined,
          recommendedTests: dto.recommendedTests ?? [],
          treatmentInstructions: dto.treatmentInstructions,
          followUpDate,
        },
        include: {
          doctor: {
            include: {
              user: { select: { name: true } },
              clinic: { select: { name: true, city: true } },
              department: true,
            },
          },
          token: {
            select: {
              tokenNumber: true,
              patientName: true,
              patientPhone: true,
              status: true,
              universalTrackingId: true,
            },
          },
        },
      });
    } catch (error) {
      this.handleDbError(error, `recording consultation notes for token '${tokenId}'`);
    }
  }

  async getConsultationNote(tokenId: string) {
    try {
      const note = await this.prisma.consultationNote.findUnique({
        where: { tokenId },
        include: {
          doctor: {
            include: {
              user: { select: { name: true, avatarUrl: true } },
              clinic: {
                select: {
                  name: true,
                  city: true,
                  address: true,
                  contactPhone: true,
                },
              },
              department: true,
            },
          },
          token: {
            select: {
              id: true,
              tokenNumber: true,
              patientName: true,
              patientPhone: true,
              createdAt: true,
              checkupCompletedAt: true,
              universalTrackingId: true,
            },
          },
        },
      });

      if (!note) {
        throw new NotFoundException(`No consultation note found for token '${tokenId}'`);
      }

      return note;
    } catch (error) {
      this.handleDbError(error, `fetching note for token '${tokenId}'`);
    }
  }

  async getPatientHistory(patientPhone: string) {
    try {
      return await this.prisma.consultationNote.findMany({
        where: {
          token: {
            patientPhone,
          },
        },
        orderBy: { createdAt: 'desc' },
        include: {
          doctor: {
            include: {
              user: { select: { name: true, avatarUrl: true } },
              clinic: { select: { name: true, city: true } },
              department: true,
            },
          },
          token: {
            select: {
              tokenNumber: true,
              patientName: true,
              checkupCompletedAt: true,
              universalTrackingId: true,
              session: {
                select: { date: true, sessionType: true },
              },
            },
          },
        },
      });
    } catch (error) {
      this.handleDbError(error, `fetching longitudinal history for patient '${patientPhone}'`);
    }
  }
}
