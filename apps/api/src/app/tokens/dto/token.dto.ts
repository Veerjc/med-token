import { PaymentMode } from '@medical-proj/shared-models';
import { IsEnum, IsNotEmpty, IsOptional, IsString, Length, Matches } from 'class-validator';

/**
 * DTO for online patient token booking via direct QR scan or web discovery.
 */
export class BookTokenDto {
  @IsNotEmpty({ message: 'Session ID is required' })
  @IsString()
  sessionId!: string;

  @IsNotEmpty({ message: 'Patient phone number is required' })
  @IsString()
  @Matches(/^\+[1-9]\d{6,14}$/, {
    message: 'Phone number must be in E.164 international format (e.g. +919876543210)',
  })
  patientPhone!: string;

  @IsNotEmpty({ message: 'Patient name is required' })
  @IsString()
  @Length(2, 80, { message: 'Patient name must be between 2 and 80 characters' })
  patientName!: string;

  /**
   * Optional authenticated User ID if booking from a logged-in patient account.
   * Nullable for guest walk-ins.
   */
  @IsOptional()
  @IsString()
  patientUserId?: string;
}

/**
 * DTO for receptionist counter walk-in booking ("Paid at Counter — Cash/UPI").
 */
export class CounterBookTokenDto {
  @IsNotEmpty({ message: 'Session ID is required' })
  @IsString()
  sessionId!: string;

  @IsNotEmpty({ message: 'Patient phone number is required' })
  @IsString()
  @Matches(/^\+[1-9]\d{6,14}$/, {
    message: 'Phone number must be in E.164 international format (e.g. +919876543210)',
  })
  patientPhone!: string;

  @IsNotEmpty({ message: 'Patient name is required' })
  @IsString()
  @Length(2, 80, { message: 'Patient name must be between 2 and 80 characters' })
  patientName!: string;

  @IsNotEmpty({ message: 'Counter payment mode is required' })
  @IsEnum(PaymentMode, {
    message: 'Payment mode must be COUNTER_CASH or COUNTER_UPI',
  })
  paymentMode!: PaymentMode;
}

/**
 * DTO for pre-session token cancellation.
 */
export class CancelTokenDto {
  @IsOptional()
  @IsString()
  @Length(3, 150, { message: 'Cancellation reason must be between 3 and 150 characters' })
  reason?: string;
}

/**
 * Query parameters for multi-criteria doctor/clinic discovery search.
 */
export class SearchDiscoveryQueryDto {
  @IsOptional()
  @IsString()
  query?: string; // Text search across Doctor Name, Clinic Name, Specialization

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  specialization?: string;

  @IsOptional()
  @IsString()
  clinicId?: string;
}

/**
 * BookTokenDto vs CounterBookTokenDto:
BookTokenDto: Used by patients online. Creates a Token in BOOKED status and initializes a Payment in PENDING status.

  
CounterBookTokenDto: Used by receptionists at the counter desk. Requires paymentMode (COUNTER_CASH or COUNTER_UPI) and immediately marks the payment as PAID, logged against the receptionist's user ID.
Duplicate Prevention Guard:
  
Matches the Prisma schema constraint @@unique([sessionId, patientPhone, patientName]). A patient cannot accidentally double-book tokens for the exact same patient in the exact same doctor session.
E.164 Phone Validation:
  
Ensures strict phone number format (+91XXXXXXXXXX) needed for SMS/WhatsApp live tracking dispatch.
  
SearchDiscoveryQueryDto:
Powers the patient discovery search bar, supporting free-text search across doctor names, medical specialties, clinic names, and cities.
 * 
 * 
*/
