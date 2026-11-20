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
import { PaymentsService } from './payments.service';
import {
  CounterCollectPaymentDto,
  CreatePaymentIntentDto,
  PaymentWebhookDto,
} from './dto/payment.dto';
import { ApiResponse, UserRole } from '@medical-proj/shared-models';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  /**
   * POST /api/payments/create-intent
   * Generate online payment gateway intent/order for client checkout (Razorpay / UPI).
   * Public endpoint (patients paying for their booked token).
   */
  @Post('create-intent')
  @HttpCode(HttpStatus.OK)
  async createPaymentIntent(
    @Body() dto: CreatePaymentIntentDto,
  ): Promise<ApiResponse<Awaited<ReturnType<PaymentsService['createPaymentIntent']>>>> {
    const data = await this.paymentsService.createPaymentIntent(dto);
    return {
      success: true,
      message: 'Payment intent created successfully',
      data,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * POST /api/payments/counter-collect
   * Record in-person cash or desk UPI payment accepted at reception.
   * Restricted to: RECEPTIONIST, CLINIC_ADMIN, SUPER_ADMIN.
   */
  @Post('counter-collect')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.RECEPTIONIST, UserRole.CLINIC_ADMIN, UserRole.SUPER_ADMIN)
  async counterCollectPayment(
    @Body() dto: CounterCollectPaymentDto,
    @CurrentUser('id') staffUserId?: string,
  ): Promise<ApiResponse<Awaited<ReturnType<PaymentsService['counterCollectPayment']>>>> {
    const data = await this.paymentsService.counterCollectPayment(dto, staffUserId);
    return {
      success: true,
      message: 'Counter payment recorded successfully',
      data,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * POST /api/payments/webhook
   * Payment gateway asynchronous confirmation webhook.
   * Updates payment status to PAID or FAILED.
   * Public endpoint (called by gateway servers).
   */
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async processWebhook(
    @Body() dto: PaymentWebhookDto,
  ): Promise<ApiResponse<Awaited<ReturnType<PaymentsService['processWebhook']>>>> {
    const data = await this.paymentsService.processWebhook(dto);
    return {
      success: true,
      message: 'Payment webhook processed successfully',
      data,
      timestamp: new Date().toISOString(),
    };
  }
  /**
   * GET /api/payments/token/:tokenId
   * Retrieve payment status and fee breakdown for a token.
   * Public endpoint.
   */
  @Get('token/:tokenId')
  async getPaymentByTokenId(
    @Param('tokenId') tokenId: string,
  ): Promise<ApiResponse<Awaited<ReturnType<PaymentsService['getPaymentByTokenId']>>>> {
    const data = await this.paymentsService.getPaymentByTokenId(tokenId);
    return {
      success: true,
      data,
      timestamp: new Date().toISOString(),
    };
  }
}
