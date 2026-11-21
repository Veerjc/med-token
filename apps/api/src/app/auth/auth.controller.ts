import { Body, Controller, Get, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto, SendOtpDto, VerifyOtpDto } from './dto/auth.dto';
import { ApiResponse, UserDto } from '@medical-proj/shared-models';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * POST /api/auth/send-otp
   * Generates a 6-digit cryptographic OTP, caches it in Redis for 300s,
   * and dispatches it via SMS / WhatsApp.
   */
  @Post('send-otp')
  @HttpCode(HttpStatus.OK)
  async sendOtp(
    @Body() dto: SendOtpDto,
  ): Promise<ApiResponse<Awaited<ReturnType<AuthService['sendOtp']>>>> {
    const data = await this.authService.sendOtp(dto);
    return {
      success: true,
      message: 'OTP dispatched successfully via SMS / WhatsApp',
      data,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * POST /api/auth/verify-otp
   * Validates the 6-digit OTP (or master OTP '123456' in dev mode),
   * auto-provisions a PATIENT account if new, and issues JWT access & refresh tokens.
   */
  @Post('verify-otp')
  @HttpCode(HttpStatus.OK)
  async verifyOtp(
    @Body() dto: VerifyOtpDto,
  ): Promise<ApiResponse<Awaited<ReturnType<AuthService['verifyOtp']>>>> {
    const data = await this.authService.verifyOtp(dto);
    return {
      success: true,
      message: 'OTP verified successfully and user is logged in',
      data,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * POST /api/auth/login
   * Authenticates Doctors, Clinic Admins, and Super Admins using Email + Bcrypt password.
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
  ): Promise<ApiResponse<Awaited<ReturnType<AuthService['login']>>>> {
    const data = await this.authService.login(dto);
    return {
      success: true,
      message: 'User logged in successfully',
      data,
      timestamp: new Date().toISOString(),
    };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  getProfile(@CurrentUser() user: UserDto): ApiResponse<UserDto> {
    return {
      success: true,
      message: 'User profile retrieved successfully',
      data: user,
      timestamp: new Date().toISOString(),
    };
  }
}

// @HttpCode(HttpStatus.OK): In NestJS, POST routes default to 201 Created. For actions like login, send-otp, and verify-otp, returning standard 200 OK complies with the contract in api-details.md.

// Type-Safe ApiResponse<T>: Every endpoint returns the standardized { success, message, data, timestamp } envelope defined in @medical-proj/shared-models.

// Automatic DTO Validation: @Body() dto: SendOtpDto / VerifyOtpDto / LoginDto triggers NestJS's global ValidationPipe with class-validator.
