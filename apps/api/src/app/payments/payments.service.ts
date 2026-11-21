import {
  BadRequestException,
  HttpException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PaymentStatus, TokenStatus } from '@medical-proj/shared-models';
import { PrismaService } from '../prisma/prisma.service';
import {
  CounterCollectPaymentDto,
  CreatePaymentIntentDto,
  PaymentWebhookDto,
} from './dto/payment.dto';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  constructor(private readonly prisma: PrismaService) {}
  /**
   * Database Failover Interceptor
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
   * 1. Create Online Payment Intent / Order
   * Prepares order details for client payment checkout (Razorpay / UPI / Cards).
   */
  async createPaymentIntent(dto: CreatePaymentIntentDto) {
    try {
      const payment = await this.prisma.payment.findUnique({
        where: { tokenId: dto.tokenId },
        include: {
          token: {
            include: {
              doctor: {
                include: { user: { select: { name: true } } },
              },
              clinic: { select: { name: true, city: true } },
            },
          },
        },
      });
      if (!payment) {
        throw new NotFoundException(`No payment record found for token '${dto.tokenId}'`);
      }
      if (payment.status === PaymentStatus.PAID) {
        throw new BadRequestException('This token has already been paid for');
      }
      if (payment.token.status === TokenStatus.CANCELLED) {
        throw new BadRequestException('Cannot initiate payment for a cancelled token');
      }
      // Generate order identifier for client gateway integration
      const orderId = `order_${randomBytes(6).toString('hex')}`;
      const amountInPaise = Math.round(Number(payment.totalAmount) * 100);
      return {
        orderId,
        currency: 'INR',
        amount: amountInPaise,
        displayAmount: Number(payment.totalAmount),
        tokenId: dto.tokenId,
        consultationFee: Number(payment.consultationFee),
        platformFee: Number(payment.platformFee),
        doctorName: payment.token.doctor.user.name,
        clinicName: payment.token.clinic.name,
      };
    } catch (error) {
      this.handleDbError(error, 'creating payment intent');
    }
  }

  /**
   * 2. Receptionist Counter Payment Collection
   * Records in-person cash or desk UPI payments for an existing token.
   * Updates payment status to PAID with staff member attribution.
   */
  async counterCollectPayment(dto: CounterCollectPaymentDto, staffUserId?: string) {
    try {
      const payment = await this.prisma.payment.findUnique({
        where: { tokenId: dto.tokenId },
        include: { token: true },
      });
      if (!payment) {
        throw new NotFoundException(`Payment record for token '${dto.tokenId}' not found`);
      }
      if (payment.status === PaymentStatus.PAID) {
        throw new BadRequestException('Payment for this token has already been collected');
      }
      if (payment.token.status === TokenStatus.CANCELLED) {
        throw new BadRequestException('Cannot collect payment for a cancelled token');
      }
      return await this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: PaymentStatus.PAID,
          mode: dto.mode,
          collectedByUserId: staffUserId,
          paidAt: new Date(),
        },
        include: {
          token: {
            select: {
              tokenNumber: true,
              patientName: true,
              patientPhone: true,
              universalTrackingId: true,
            },
          },
          collectedBy: {
            select: { name: true, role: true },
          },
        },
      });
    } catch (error) {
      this.handleDbError(error, 'recording counter payment collection');
    }
  }

  /**
   * 3. Payment Gateway Webhook Handler
   * Processes asynchronous payment gateway notifications (e.g. payment.captured).
   */
  async processWebhook(dto: PaymentWebhookDto) {
    try {
      const payment = await this.prisma.payment.findUnique({
        where: { tokenId: dto.tokenId },
      });
      if (!payment) {
        throw new NotFoundException(`Payment record for token '${dto.tokenId}' not found`);
      }
      if (dto.event === 'payment.captured') {
        return await this.prisma.payment.update({
          where: { id: payment.id },
          data: {
            status: PaymentStatus.PAID,
            gatewayTxnId: dto.gatewayTxnId,
            paidAt: new Date(),
          },
        });
      } else if (dto.event === 'payment.failed') {
        return await this.prisma.payment.update({
          where: { id: payment.id },
          data: {
            status: PaymentStatus.FAILED,
            gatewayTxnId: dto.gatewayTxnId,
          },
        });
      }
      return payment;
    } catch (error) {
      this.handleDbError(error, 'processing payment webhook');
    }
  }

  /**
   * 4. Retrieve Payment Details & Line-Item Receipt by Token ID
   */
  async getPaymentByTokenId(tokenId: string) {
    try {
      const payment = await this.prisma.payment.findUnique({
        where: { tokenId },
        include: {
          token: {
            include: {
              doctor: {
                include: { user: { select: { name: true } } },
              },
              clinic: { select: { name: true, address: true, city: true } },
            },
          },
          collectedBy: {
            select: { name: true, role: true },
          },
        },
      });
      if (!payment) {
        throw new NotFoundException(`Payment for token '${tokenId}' not found`);
      }
      return payment;
    } catch (error) {
      this.handleDbError(error, `fetching payment for token '${tokenId}'`);
    }
  }
}
