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
import { ApiResponse, UserRole } from '@medical-proj/shared-models';
import { TokensService } from './tokens.service';
import {
  BookTokenDto,
  CancelTokenDto,
  CounterBookTokenDto,
  SearchDiscoveryQueryDto,
} from './dto/token.dto';
import { RolesGuard } from '../auth/guards/roles.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller()
export class TokensController {
  constructor(private readonly tokensService: TokensService) {}
  // =========================================================================
  // Discovery Endpoints (/api/discovery)
  // =========================================================================
  /**
   * GET /api/discovery/clinics/:slug
   * Resolves physical clinic entrance poster QR scan (e.g. /clinic/city-care-whitefield).
   * Returns clinic metadata, operating hours, and active/upcoming doctor sessions for today.
   */
  @Get('discovery/clinics/:slug')
  async resolveClinicQr(
    @Param('slug') slug: string,
  ): Promise<ApiResponse<Awaited<ReturnType<TokensService['resolveClinicQr']>>>> {
    const data = await this.tokensService.resolveClinicQr(slug);
    return {
      success: true,
      data,
      timestamp: new Date().toISOString(),
    };
  }
  /**
   * GET /api/discovery/search
   * Multi-criteria patient search across doctor names, specialties, clinic names, and cities.
   */
  @Get('discovery/search')
  async searchDiscovery(
    @Query() query: SearchDiscoveryQueryDto,
  ): Promise<ApiResponse<Awaited<ReturnType<TokensService['searchDiscovery']>>>> {
    const data = await this.tokensService.searchDiscovery(query);
    return {
      success: true,
      data,
      timestamp: new Date().toISOString(),
    };
  }
  // =========================================================================
  // Token Endpoints (/api/tokens)
  // =========================================================================
  /**
   * POST /api/tokens/book
   * Online patient same-day token booking.
   * Auto-assigns sequential token number, enforces 30-min booking cutoff,
   * enforces capacity cap, and generates cryptographic tracking ID.
   */
  @Post('tokens/book')
  @HttpCode(HttpStatus.CREATED)
  async bookToken(
    @Body() dto: BookTokenDto,
  ): Promise<ApiResponse<Awaited<ReturnType<TokensService['bookToken']>>>> {
    const data = await this.tokensService.bookToken(dto);
    return {
      success: true,
      message: 'Token booked successfully',
      data,
      timestamp: new Date().toISOString(),
    };
  }
  /**
   * POST /api/tokens/counter-book
   * Receptionist walk-in counter booking ("Paid at Counter — Cash/UPI").
   * Automatically records Payment as PAID with staff member attribution.
   * Restricted to: RECEPTIONIST, CLINIC_ADMIN, SUPER_ADMIN.
   */
  @Post('tokens/counter-book')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.RECEPTIONIST, UserRole.CLINIC_ADMIN, UserRole.SUPER_ADMIN)
  async counterBookToken(
    @Body() dto: CounterBookTokenDto,
    @CurrentUser('id') staffUserId?: string,
  ): Promise<ApiResponse<Awaited<ReturnType<TokensService['counterBookToken']>>>> {
    const data = await this.tokensService.counterBookToken(dto, staffUserId);
    return {
      success: true,
      message: 'Counter walk-in token issued successfully',
      data,
      timestamp: new Date().toISOString(),
    };
  }
  /**
   * GET /api/tokens/track/:trackingId
   * Public patient live tracking slug resolution (/track/:trackingCode).
   * Calculates live queue metrics: current serving token, wait time range, and urgent alert.
   */
  @Get('tokens/track/:trackingId')
  async trackToken(
    @Param('trackingId') trackingId: string,
  ): Promise<ApiResponse<Awaited<ReturnType<TokensService['trackToken']>>>> {
    const data = await this.tokensService.trackToken(trackingId);
    return {
      success: true,
      data,
      timestamp: new Date().toISOString(),
    };
  }
  /**
   * GET /api/tokens/session/:sessionId
   * List all tokens in an OPD session.
   * Used by Doctor Queue Controller and Receptionist Desk.
   * Restricted to: DOCTOR, RECEPTIONIST, CLINIC_ADMIN, SUPER_ADMIN.
   */
  @Get('tokens/session/:sessionId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.DOCTOR, UserRole.RECEPTIONIST, UserRole.CLINIC_ADMIN, UserRole.SUPER_ADMIN)
  async getSessionTokens(
    @Param('sessionId') sessionId: string,
  ): Promise<ApiResponse<Awaited<ReturnType<TokensService['getSessionTokens']>>>> {
    const data = await this.tokensService.getSessionTokens(sessionId);
    return {
      success: true,
      data,
      timestamp: new Date().toISOString(),
    };
  }
  /**
   * PATCH /api/tokens/:id/cancel
   * Pre-session token cancellation.
   */
  @Patch('tokens/:id/cancel')
  async cancelToken(
    @Param('id') id: string,
    @Body() dto: CancelTokenDto,
  ): Promise<ApiResponse<Awaited<ReturnType<TokensService['cancelToken']>>>> {
    const data = await this.tokensService.cancelToken(id, dto);
    return {
      success: true,
      message: 'Token cancelled successfully',
      data,
      timestamp: new Date().toISOString(),
    };
  }
}
