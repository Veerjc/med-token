import { IsInt, IsNotEmpty, IsOptional, IsString, Max, Min } from 'class-validator';

/**
 * DTO for calling a token to the doctor's examination room (status -> CALLED).
 */
export class CallTokenDto {
  @IsNotEmpty({ message: 'Token number is required' })
  @IsInt()
  @Min(1, { message: 'Token number must be at least 1' })
  tokenNumber!: number;
}

/**
 * DTO for doctor beginning the active examination (status -> SERVING).
 */
export class StartCheckupDto {
  @IsNotEmpty({ message: 'Token number is required' })
  @IsInt()
  @Min(1, { message: 'Token number must be at least 1' })
  tokenNumber!: number;
}

/**
 * DTO for temporarily putting a patient on hold (status -> ON_HOLD).
 * Pushes the patient back by a configurable number of slots (default: 5 slots).
 */
export class HoldTokenDto {
  @IsNotEmpty({ message: 'Token number is required' })
  @IsInt()
  @Min(1, { message: 'Token number must be at least 1' })
  tokenNumber!: number;
  @IsOptional()
  @IsInt()
  @Min(1, { message: 'Slots to push back must be at least 1' })
  @Max(20, { message: 'Cannot push back by more than 20 slots' })
  slotsToPushBack?: number = 5;
}

/**
 * DTO for completing an active patient checkup (status -> COMPLETED).
 * Triggers duration calculation and recalculates doctor's rolling average duration.
 */
export class CompleteCheckupDto {
  @IsNotEmpty({ message: 'Token number is required' })
  @IsInt()
  @Min(1, { message: 'Token number must be at least 1' })
  tokenNumber!: number;
}

/**
 * DTO for marking an absent patient as a No-Show (status -> NO_SHOW).
 */
export class NoShowTokenDto {
  @IsNotEmpty({ message: 'Token number is required' })
  @IsInt()
  @Min(1, { message: 'Token number must be at least 1' })
  tokenNumber!: number;
  @IsOptional()
  @IsString()
  reason?: string;
}
