import { SessionType } from '@medical-proj/shared-models';
import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Matches,
  Min,
} from 'class-validator';

export class CreateDoctorDto {
  @IsNotEmpty({ message: 'User ID is required' })
  @IsString()
  userId!: string;
  @IsNotEmpty({ message: 'Organization ID is required' })
  @IsString()
  organizationId!: string;
  @IsNotEmpty({ message: 'Clinic ID is required' })
  @IsString()
  clinicId!: string;
  @IsOptional()
  @IsString()
  departmentId?: string;
  @IsNotEmpty({ message: 'Specialization is required' })
  @IsString()
  @Length(2, 100, { message: 'Specialization must be between 2 and 100 characters' })
  specialization!: string;
  @IsOptional()
  @IsString()
  qualifications?: string; // E.g. "MBBS, MD (General Medicine)"
  @IsOptional()
  @IsString()
  registrationNumber?: string; // Medical Council Registration Number
  @IsOptional()
  @IsNumber()
  @Min(0)
  experienceYears?: number;
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  languages?: string[];
  @IsOptional()
  @IsString()
  about?: string;
  @IsOptional()
  @IsString()
  avatarUrl?: string;
  @IsOptional()
  @IsNumber()
  @Min(0)
  consultationFee?: number;
  @IsOptional()
  @IsNumber()
  @Min(5)
  defaultSlotDurationMins?: number;
  @IsOptional()
  @IsNumber()
  @Min(1)
  defaultTokenCapacity?: number;
  @IsNotEmpty({ message: 'Doctor QR slug is required' })
  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'Doctor QR slug must be lowercase alphanumeric with hyphens (e.g. dr-sarah-chen)',
  })
  doctorQrSlug!: string;
}

export class ScheduleShiftDto {
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  dayOfWeek!: number; // 0 = Sunday, 1 = Monday ... 6 = Saturday

  @IsNotEmpty()
  @IsEnum(SessionType, {
    message: 'sessionType must be MORNING, AFTERNOON, EVENING, or NIGHT',
  })
  sessionType!: SessionType;

  @IsNotEmpty()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'startTime must be in HH:mm 24-hour format (e.g. 09:00)',
  })
  startTime!: string;

  @IsNotEmpty()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'endTime must be in HH:mm 24-hour format (e.g. 13:00)',
  })
  endTime!: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  tokenCapacity?: number;
}

export class SetDoctorScheduleDto {
  @IsNotEmpty()
  @IsArray()
  shifts!: ScheduleShiftDto[];
}

export class CreateDoctorHolidayDto {
  @IsNotEmpty({ message: 'Date is required' })
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'Date must be in YYYY-MM-DD format (e.g. 2026-11-25)',
  })
  date!: string;

  @IsOptional()
  @IsEnum(SessionType, {
    message: 'sessionType must be MORNING, AFTERNOON, EVENING, or NIGHT',
  })
  sessionType?: SessionType; // If omitted, counts as Full-Day Leave; if specified, counts as Half-Day Leave

  @IsOptional()
  @IsString()
  @Length(3, 120, { message: 'Reason must be between 3 and 120 characters' })
  reason?: string;
}
