import { SessionStatus, SessionType } from '@medical-proj/shared-models';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
} from 'class-validator';

/**
 * DTO for initializing or opening an OPD session for a given doctor & shift.
 */
export class OpenSessionDto {
  @IsNotEmpty({ message: 'Doctor ID is required' })
  @IsString()
  doctorId!: string;

  @IsNotEmpty({ message: 'Clinic ID is required' })
  @IsString()
  clinicId!: string;

  @IsNotEmpty({ message: 'Date is required' })
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'Date must be in YYYY-MM-DD format (e.g. 2026-11-20)',
  })
  date!: string;

  @IsNotEmpty({ message: 'sessionType is required' })
  @IsEnum(SessionType, {
    message: 'sessionType must be MORNING, AFTERNOON, EVENING, or NIGHT',
  })
  sessionType!: SessionType;

  /**
   * Optional manual override of token capacity.
   * If omitted, falls back to the doctor's schedule shift capacity or default capacity.
   */
  @IsOptional()
  @IsInt()
  @Min(1, { message: 'Token capacity must be at least 1' })
  @Max(250, { message: 'Token capacity cannot exceed 250 tokens per session' })
  tokenCapacity?: number;

  /**
   * Optional manual override for booking cutoff timestamp (ISO 8601).
   * If omitted, the service calculates it automatically as 30 minutes before shift close.
   */
  @IsOptional()
  @IsString()
  bookingCutoffAt?: string;
}

/**
 * DTO for updating a doctor's live operational status during an active session.
 */
export class UpdateSessionStatusDto {
  @IsNotEmpty({ message: 'Session status is required' })
  @IsEnum(SessionStatus, {
    message:
      'status must be NOT_ARRIVED, ARRIVED, OPD_STARTED, LUNCH_BREAK, ON_ROUNDS, EMERGENCY_DUTY, or CLOSED',
  })
  status!: SessionStatus;
  @IsOptional()
  @IsString()
  reason?: string;
}

/**
 * DTO for dynamically overriding token capacity during an active session on the fly.
 */
export class UpdateSessionCapacityDto {
  @IsNotEmpty({ message: 'Token capacity is required' })
  @IsInt()
  @Min(1, { message: 'Token capacity must be at least 1' })
  @Max(250, { message: 'Token capacity cannot exceed 250 tokens per session' })
  tokenCapacity!: number;
  @IsOptional()
  @IsString()
  reason?: string;
}

/**
 * Query parameters for filtering active sessions.
 */
export class GetActiveSessionsQueryDto {
  @IsOptional()
  @IsString()
  clinicId?: string;
  @IsOptional()
  @IsString()
  doctorId?: string;
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'date must be in YYYY-MM-DD format (e.g. 2026-11-20)',
  })
  date?: string;
  @IsOptional()
  @IsEnum(SessionType)
  sessionType?: SessionType;
}
