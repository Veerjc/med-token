import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiResponse, UserRole } from '@medical-proj/shared-models';
import { ClinicsService } from './clinics.service';
import { CreateClinicDto, CreateClinicHolidayDto, CreateOrganizationDto } from './dto/clinic.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller()
export class ClinicsController {
  constructor(private readonly clinicsService: ClinicsService) {}

  // =========================================================================
  // Organizations
  // =========================================================================

  /**
   * POST /api/organizations
   * Onboard a new Hospital/Clinic Organization.
   * Restricted to: SUPER_ADMIN, CLINIC_ADMIN, ONBOARDING_PARTNER.
   */
  @Post('organizations')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.CLINIC_ADMIN, UserRole.ONBOARDING_PARTNER)
  async createOrganization(
    @Body() dto: CreateOrganizationDto,
  ): Promise<ApiResponse<Awaited<ReturnType<ClinicsService['createOrganization']>>>> {
    const data = await this.clinicsService.createOrganization(dto);
    return {
      success: true,
      message: 'Organization registered successfully',
      data,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * GET /api/organizations/:id
   * Retrieve Organization details and all associated clinic branches.
   */
  @Get('organizations/:id')
  @UseGuards(JwtAuthGuard)
  async getOrganization(
    @Param('id') id: string,
  ): Promise<ApiResponse<Awaited<ReturnType<ClinicsService['getOrganization']>>>> {
    const data = await this.clinicsService.getOrganization(id);
    return {
      success: true,
      message: 'Organization retrieved successfully',
      data,
      timestamp: new Date().toISOString(),
    };
  }

  // =========================================================================
  // Clinics
  // =========================================================================

  /**
   * POST /api/clinics
   * Register a physical clinic branch with unique QR slug and default hours.
   * Restricted to: SUPER_ADMIN, CLINIC_ADMIN.
   */
  @Post('clinics')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.CLINIC_ADMIN)
  async createClinic(
    @Body() dto: CreateClinicDto,
  ): Promise<ApiResponse<Awaited<ReturnType<ClinicsService['createClinic']>>>> {
    const data = await this.clinicsService.createClinic(dto);
    return {
      success: true,
      message: 'Clinic branch registered successfully',
      data,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * GET /api/clinics/:id
   * Public discovery endpoint: Retrieve Clinic details, schedule, and operating hours.
   */
  @Get('clinics/:id')
  async getClinic(
    @Param('id') id: string,
  ): Promise<ApiResponse<Awaited<ReturnType<ClinicsService['getClinic']>>>> {
    const data = await this.clinicsService.getClinic(id);
    return {
      success: true,
      message: 'Clinic retrieved successfully',
      data,
      timestamp: new Date().toISOString(),
    };
  }

  // =========================================================================
  // Holidays & Facility Closures
  // =========================================================================

  /**
   * POST /api/clinics/:id/holidays
   * Declare a facility closure / holiday.
   * Restricted to: SUPER_ADMIN, CLINIC_ADMIN.
   */
  @Post('clinics/:id/holidays')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.CLINIC_ADMIN)
  async createHoliday(
    @Param('id') id: string,
    @Body() dto: CreateClinicHolidayDto,
  ): Promise<ApiResponse<Awaited<ReturnType<ClinicsService['createHoliday']>>>> {
    const data = await this.clinicsService.createHoliday(id, dto);
    return {
      success: true,
      message: 'Facility holiday closure declared successfully',
      data,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * GET /api/clinics/:id/holidays
   * Public endpoint: List upcoming holiday closures for a clinic.
   */
  @Get('clinics/:id/holidays')
  async getHolidays(
    @Param('id') id: string,
    @Query('from') from?: string,
  ): Promise<ApiResponse<Awaited<ReturnType<ClinicsService['getHolidays']>>>> {
    const data = await this.clinicsService.getHolidays(id, from);
    return {
      success: true,
      message: 'Clinic holidays retrieved successfully',
      data,
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Highlights of this Controller
    Exact Routes from Specification:
    POST /api/organizations
    GET /api/organizations/:id
    POST /api/clinics
    GET /api/clinics/:id
    POST /api/clinics/:id/holidays
    GET /api/clinics/:id/holidays

    Precision RBAC Protection:
    POST /api/clinics requires CLINIC_ADMIN or SUPER_ADMIN.
    GET /api/clinics/:id has no guards because patient mobile apps and QR posters need to resolve clinic information publicly before the patient logs in.
    Type-Safe ApiResponse<T>: Wraps all payloads into the unified envelope with timestamps.
 * 
 * */
