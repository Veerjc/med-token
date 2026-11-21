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
import { QueueService } from './queue.service';
import {
  CallTokenDto,
  CompleteCheckupDto,
  HoldTokenDto,
  NoShowTokenDto,
  StartCheckupDto,
} from './dto/queue.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('queue')
export class QueueController {
  constructor(private readonly queueService: QueueService) {}

  /**
   * POST /api/queue/:sessionId/call
   * Call a token to the examination room.
   * Restricted to: DOCTOR, RECEPTIONIST, CLINIC_ADMIN, SUPER_ADMIN.
   */
  @Post(':sessionId/call')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.DOCTOR, UserRole.RECEPTIONIST, UserRole.CLINIC_ADMIN, UserRole.SUPER_ADMIN)
  async callToken(
    @Param('sessionId') sessionId: string,
    @Body() dto: CallTokenDto,
  ): Promise<ApiResponse<Awaited<ReturnType<QueueService['callToken']>>>> {
    const data = await this.queueService.callToken(sessionId, dto);
    return {
      success: true,
      message: `Token #${dto.tokenNumber} called successfully`,
      data,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * POST /api/queue/:sessionId/start
   * Begin patient examination in doctor room (status -> SERVING).
   * Restricted to: DOCTOR, RECEPTIONIST, CLINIC_ADMIN, SUPER_ADMIN.
   */
  @Post(':sessionId/start')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.DOCTOR, UserRole.RECEPTIONIST, UserRole.CLINIC_ADMIN, UserRole.SUPER_ADMIN)
  async startCheckup(
    @Param('sessionId') sessionId: string,
    @Body() dto: StartCheckupDto,
  ): Promise<ApiResponse<Awaited<ReturnType<QueueService['startCheckup']>>>> {
    const data = await this.queueService.startCheckup(sessionId, dto);
    return {
      success: true,
      message: `Examination started for token #${dto.tokenNumber}`,
      data,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * POST /api/queue/:sessionId/hold
   * Temporarily place a token on hold (status -> ON_HOLD) and push back slots.
   * Restricted to: DOCTOR, RECEPTIONIST, CLINIC_ADMIN, SUPER_ADMIN.
   */
  @Post(':sessionId/hold')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.DOCTOR, UserRole.RECEPTIONIST, UserRole.CLINIC_ADMIN, UserRole.SUPER_ADMIN)
  async holdToken(
    @Param('sessionId') sessionId: string,
    @Body() dto: HoldTokenDto,
  ): Promise<ApiResponse<Awaited<ReturnType<QueueService['holdToken']>>>> {
    const data = await this.queueService.holdToken(sessionId, dto);
    return {
      success: true,
      message: `Token #${dto.tokenNumber} placed on hold`,
      data,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * POST /api/queue/:sessionId/complete
   * Mark consultation as complete and recalculate rolling average duration.
   * Restricted to: DOCTOR, RECEPTIONIST, CLINIC_ADMIN, SUPER_ADMIN.
   */
  @Post(':sessionId/complete')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.DOCTOR, UserRole.RECEPTIONIST, UserRole.CLINIC_ADMIN, UserRole.SUPER_ADMIN)
  async completeCheckup(
    @Param('sessionId') sessionId: string,
    @Body() dto: CompleteCheckupDto,
  ): Promise<ApiResponse<Awaited<ReturnType<QueueService['completeCheckup']>>>> {
    const data = await this.queueService.completeCheckup(sessionId, dto);
    return {
      success: true,
      message: `Consultation completed for token #${dto.tokenNumber}`,
      data,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * POST /api/queue/:sessionId/no-show
   * Mark an absent patient as a No-Show (status -> NO_SHOW).
   * Restricted to: DOCTOR, RECEPTIONIST, CLINIC_ADMIN, SUPER_ADMIN.
   */
  @Post(':sessionId/no-show')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.DOCTOR, UserRole.RECEPTIONIST, UserRole.CLINIC_ADMIN, UserRole.SUPER_ADMIN)
  async markNoShow(
    @Param('sessionId') sessionId: string,
    @Body() dto: NoShowTokenDto,
  ): Promise<ApiResponse<Awaited<ReturnType<QueueService['markNoShow']>>>> {
    const data = await this.queueService.markNoShow(sessionId, dto);
    return {
      success: true,
      message: `Token #${dto.tokenNumber} marked as No-Show`,
      data,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * GET /api/queue/:sessionId/live
   * Retrieve full live queue state, active token roster, and wait time metrics.
   * Public endpoint (used by Doctor controller, Receptionist board, and Patient view).
   */
  @Get(':sessionId/live')
  async getLiveQueueState(
    @Param('sessionId') sessionId: string,
  ): Promise<ApiResponse<Awaited<ReturnType<QueueService['getLiveQueueState']>>>> {
    const data = await this.queueService.getLiveQueueState(sessionId);
    return {
      success: true,
      data,
      timestamp: new Date().toISOString(),
    };
  }
}
