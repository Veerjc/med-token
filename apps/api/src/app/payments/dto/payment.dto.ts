import { PaymentMode } from '@medical-proj/shared-models';
import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

/**
 * DTO for creating an online payment intent/order (e.g. Razorpay / UPI).
 */
export class CreatePaymentIntentDto {
  @IsNotEmpty({ message: 'Token ID is required' })
  @IsString()
  tokenId!: string;

  @IsOptional()
  @IsString()
  gateway?: string; // Optional gateway identifier (defaults to RAZORPAY)
}

/**
 * DTO for recording counter cash or counter UPI collection by a receptionist.
 */
export class CounterCollectPaymentDto {
  @IsNotEmpty({ message: 'Token ID is required' })
  @IsString()
  tokenId!: string;

  @IsNotEmpty({ message: 'Payment mode is required' })
  @IsEnum(PaymentMode, {
    message: 'Payment mode must be COUNTER_CASH or COUNTER_UPI',
  })
  mode!: PaymentMode;

  @IsOptional()
  @IsString()
  notes?: string;
}

/**
 * DTO for processing payment gateway webhook events.
 */
export class PaymentWebhookDto {
  @IsNotEmpty({ message: 'Event type is required' })
  @IsString()
  event!: string; // E.g. 'payment.captured', 'payment.failed'

  @IsNotEmpty({ message: 'Gateway transaction ID is required' })
  @IsString()
  gatewayTxnId!: string;

  @IsNotEmpty({ message: 'Token ID is required' })
  @IsString()
  tokenId!: string;

  @IsNotEmpty({ message: 'Amount is required' })
  @IsNumber()
  @Min(0, { message: 'Amount must be non-negative' })
  amount!: number;

  @IsOptional()
  @IsString()
  signature?: string;
}
