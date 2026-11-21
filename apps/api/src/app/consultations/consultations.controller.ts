import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiResponse, UserRole } from '@medical-proj/shared-models';
import { ConsultationsService } from './consultations.service';
import { UpsertConsultationNoteDto } from './dto/consultation.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('consultations')
export class ConsultationsController {
  constructor(private readonly consultationsService: ConsultationsService) {}

  /**
   * GET /api/consultations/patient/:patientPhone
   * Retrieve longitudinal medical visit history for a patient by phone number.
   * Placed BEFORE ':tokenId/notes' to prevent parameter route collision.
   * Restricted to: DOCTOR, RECEPTIONIST, CLINIC_ADMIN, SUPER_ADMIN, PATIENT.
   */
  @Get('patient/:patientPhone')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    UserRole.DOCTOR,
    UserRole.RECEPTIONIST,
    UserRole.CLINIC_ADMIN,
    UserRole.SUPER_ADMIN,
    UserRole.PATIENT,
  )
  async getPatientHistory(
    @Param('patientPhone') patientPhone: string,
  ): Promise<ApiResponse<Awaited<ReturnType<ConsultationsService['getPatientHistory']>>>> {
    const data = await this.consultationsService.getPatientHistory(patientPhone);
    return {
      success: true,
      data,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * POST /api/consultations/:tokenId/notes
   * Doctor records or updates diagnosis, prescriptions, lab tests, and follow-up date.
   * Restricted to: DOCTOR, SUPER_ADMIN.
   */
  @Post(':tokenId/notes')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.DOCTOR, UserRole.SUPER_ADMIN)
  async upsertConsultationNote(
    @Param('tokenId') tokenId: string,
    @Body() dto: UpsertConsultationNoteDto,
  ): Promise<ApiResponse<Awaited<ReturnType<ConsultationsService['upsertConsultationNote']>>>> {
    const data = await this.consultationsService.upsertConsultationNote(tokenId, dto);
    return {
      success: true,
      message: 'Consultation note recorded successfully',
      data,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * GET /api/consultations/:tokenId/notes
   * Retrieve clinical note and prescription for a consultation visit.
   * Public endpoint (patients viewing their prescription link, pharmacists, doctors).
   */
  @Get(':tokenId/notes')
  async getConsultationNote(
    @Param('tokenId') tokenId: string,
  ): Promise<ApiResponse<Awaited<ReturnType<ConsultationsService['getConsultationNote']>>>> {
    const data = await this.consultationsService.getConsultationNote(tokenId);
    return {
      success: true,
      data,
      timestamp: new Date().toISOString(),
    };
  }
}
