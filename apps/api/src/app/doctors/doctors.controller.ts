import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { DoctorsService } from './doctors.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ApiResponse, UserRole } from '@medical-proj/shared-models';
import { CreateDoctorDto, CreateDoctorHolidayDto, SetDoctorScheduleDto } from './dto/doctor.dto';

@Controller('doctors')
export class DoctorsController {
  constructor(private readonly doctorsService: DoctorsService) {}

  /**
   * POST /api/doctors
   * Onboard a Doctor profile & link/promote user account.
   * Restricted to: SUPER_ADMIN, CLINIC_ADMIN.
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.CLINIC_ADMIN)
  async createDoctor(
    @Body() dto: CreateDoctorDto,
  ): Promise<ApiResponse<Awaited<ReturnType<DoctorsService['createDoctor']>>>> {
    const data = await this.doctorsService.createDoctor(dto);
    return {
      success: true,
      message: 'Doctor profile created successfully',
      data,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * GET /api/doctors/slug/:slug
   * Retrieve Doctor profile by QR poster slug (e.g. dr-sarah-chen).
   * Public discovery endpoint for patient QR scans.
   * Placed BEFORE ':id' to prevent route collision.
   */
  @Get('slug/:slug')
  async getDoctorBySlug(
    @Param('slug') slug: string,
  ): Promise<ApiResponse<Awaited<ReturnType<DoctorsService['getDoctorBySlug']>>>> {
    const data = await this.doctorsService.getDoctorBySlug(slug);
    return {
      success: true,
      data,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * GET /api/doctors/:id
   * Retrieve Doctor profile by ID (includes clinic, org, weekly shifts, upcoming leaves).
   * Public endpoint for booking portals, search results, and receptionists.
   */
  @Get(':id')
  async getDoctor(
    @Param('id') id: string,
  ): Promise<ApiResponse<Awaited<ReturnType<DoctorsService['getDoctor']>>>> {
    const data = await this.doctorsService.getDoctor(id);
    return {
      success: true,
      data,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * PUT /api/doctors/:id/schedules
   * Atomically configure/replace doctor's weekly shift timetable.
   * Restricted to: DOCTOR, CLINIC_ADMIN, SUPER_ADMIN.
   */
  @Put(':id/schedules')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.DOCTOR, UserRole.CLINIC_ADMIN, UserRole.SUPER_ADMIN)
  async setDoctorSchedules(
    @Param('id') id: string,
    @Body() dto: SetDoctorScheduleDto,
  ): Promise<ApiResponse<Awaited<ReturnType<DoctorsService['setDoctorSchedules']>>>> {
    const data = await this.doctorsService.setDoctorSchedules(id, dto);
    return {
      success: true,
      message: 'Doctor weekly schedules updated successfully',
      data,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * POST /api/doctors/:id/holidays
   * Schedule a planned leave (full-day or session-level half-day).
   * Restricted to: DOCTOR, CLINIC_ADMIN, SUPER_ADMIN.
   */
  @Post(':id/holidays')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.DOCTOR, UserRole.CLINIC_ADMIN, UserRole.SUPER_ADMIN)
  async createDoctorHoliday(
    @Param('id') id: string,
    @Body() dto: CreateDoctorHolidayDto,
  ): Promise<ApiResponse<Awaited<ReturnType<DoctorsService['createDoctorHoliday']>>>> {
    const data = await this.doctorsService.createDoctorHoliday(id, dto);
    return {
      success: true,
      message: 'Doctor holiday recorded successfully',
      data,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * GET /api/doctors/:id/holidays
   * List upcoming scheduled leaves for a doctor.
   * Public endpoint so patients and receptionists know when doctor is away.
   */
  @Get(':id/holidays')
  async getDoctorHolidays(
    @Param('id') id: string,
    @Query('fromDate') fromDate?: string,
  ): Promise<ApiResponse<Awaited<ReturnType<DoctorsService['getDoctorHolidays']>>>> {
    const data = await this.doctorsService.getDoctorHolidays(id, fromDate);
    return {
      success: true,
      data,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * DELETE /api/doctors/:id/holidays/:holidayId
   * Cancel / delete a planned leave.
   * Restricted to: DOCTOR, CLINIC_ADMIN, SUPER_ADMIN.
   */
  @Delete(':id/holidays/:holidayId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.DOCTOR, UserRole.CLINIC_ADMIN, UserRole.SUPER_ADMIN)
  async deleteDoctorHoliday(
    @Param('id') id: string,
    @Param('holidayId') holidayId: string,
  ): Promise<ApiResponse<null>> {
    await this.doctorsService.deleteDoctorHoliday(id, holidayId);
    return {
      success: true,
      message: 'Doctor holiday cancelled successfully',
      data: null,
      timestamp: new Date().toISOString(),
    };
  }
}
