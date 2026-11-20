import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { SessionService } from './sessions.service';
import { retry, timestamp } from 'rxjs';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ApiResponse, UserRole } from '@medical-proj/shared-models';
import {
  GetActiveSessionsQueryDto,
  OpenSessionDto,
  UpdateSessionCapacityDto,
  UpdateSessionStatusDto,
} from './dto/session.dto';

@Controller('sessions')
export class SessionController {
  constructor(private readonly sessionService: SessionService) {}

  /**
   * POST /api/sessions/open
   * Initialize or open an OPD session for a given doctor & shift.
   * Restricted to: DOCTOR, RECEPTIONIST, CLINIC_ADMIN, SUPER_ADMIN.
   */
  @Post('open')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.DOCTOR, UserRole.RECEPTIONIST, UserRole.CLINIC_ADMIN, UserRole.SUPER_ADMIN)
  async openSession(
    @Body() dto: OpenSessionDto,
  ): Promise<ApiResponse<Awaited<ReturnType<SessionService['openSession']>>>> {
    const data = await this.sessionService.openSession(dto);
    return {
      success: true,
      data: data,
      message: 'OPD session opened successfully',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * POST /api/sessions/generate-daily/:clinicId
   * One-Click Batch Daily OPD Session Generator for all scheduled clinic doctors.
   * Restricted to: RECEPTIONIST, CLINIC_ADMIN, SUPER_ADMIN.
   */

  @Post('generate-daily/:clinicId')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CLINIC_ADMIN, UserRole.SUPER_ADMIN, UserRole.RECEPTIONIST)
  async autoOpenDailySessions(
    @Param('clinicId') clinicId: string,
    @Query('date') date?: string,
  ): Promise<ApiResponse<Awaited<ReturnType<SessionService['autoOpenDailySessions']>>>> {
    const data = await this.sessionService.autoOpenDailySessions(clinicId, date);
    return {
      success: true,
      data: data,
      message: 'Daily OPD sessions opened successfully',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * GET /api/sessions/active
   * List active OPD sessions with live token counts.
   * Public discovery endpoint for booking and receptionist dashboard.
   * Placed BEFORE ':id' to prevent route collision.
   */
  @Get('active')
  async getActiveSessions(
    @Query() query: GetActiveSessionsQueryDto,
  ): Promise<ApiResponse<Awaited<ReturnType<SessionService['getActiveSessions']>>>> {
    const data = await this.sessionService.getActiveSessions(query);
    return {
      success: true,
      data,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * GET /api/sessions/:id
   * Retrieve session details by ID (including doctor, clinic, and token counts).
   * Public endpoint.
   */
  @Get(':id')
  async getSession(
    @Param('id') id: string,
  ): Promise<ApiResponse<Awaited<ReturnType<SessionService['getSession']>>>> {
    const data = await this.sessionService.getSession(id);
    return {
      success: true,
      data,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * PATCH /api/sessions/:id/status
   * Toggle doctor live operational status during OPD.
   * Restricted to: DOCTOR, RECEPTIONIST, CLINIC_ADMIN, SUPER_ADMIN.
   */
  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.DOCTOR, UserRole.RECEPTIONIST, UserRole.CLINIC_ADMIN, UserRole.SUPER_ADMIN)
  async updateSessionStatus(
    @Param('id') id: string,
    @Body() dto: UpdateSessionStatusDto,
  ): Promise<ApiResponse<Awaited<ReturnType<SessionService['updateSessionStatus']>>>> {
    const data = await this.sessionService.updateSessionStatus(id, dto);
    return {
      success: true,
      message: 'Doctor operational status updated successfully',
      data,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * PATCH /api/sessions/:id/capacity
   * Dynamic token capacity override on the fly.
   * Restricted to: DOCTOR, RECEPTIONIST, CLINIC_ADMIN, SUPER_ADMIN.
   */
  @Patch(':id/capacity')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.DOCTOR, UserRole.RECEPTIONIST, UserRole.CLINIC_ADMIN, UserRole.SUPER_ADMIN)
  async updateSessionCapacity(
    @Param('id') id: string,
    @Body() dto: UpdateSessionCapacityDto,
  ): Promise<ApiResponse<Awaited<ReturnType<SessionService['updateSessionCapacity']>>>> {
    const data = await this.sessionService.updateSessionCapacity(id, dto);
    return {
      success: true,
      message: 'Session token capacity updated successfully',
      data,
      timestamp: new Date().toISOString(),
    };
  }
}
