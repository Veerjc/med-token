import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  Matches,
  Min,
  ValidateNested,
} from 'class-validator';

/**
 * Individual medication item in a digital prescription.
 */
export class PrescriptionItemDto {
  @IsNotEmpty({ message: 'Medicine name is required' })
  @IsString()
  medicineName!: string;

  @IsNotEmpty({ message: 'Dosage is required' })
  @IsString()
  dosage!: string;

  @IsNotEmpty({ message: 'Frequency is required' })
  @IsString()
  frequency!: string;

  @IsNotEmpty({ message: 'Duration in days is required' })
  @IsInt()
  @Min(1, { message: 'Duration must be at least 1 day' })
  durationDays!: number;

  @IsOptional()
  @IsString()
  instructions?: string;
}

/**
 * DTO for creating or updating a digital clinical consultation note.
 */
export class UpsertConsultationNoteDto {
  @IsOptional()
  @IsString()
  @Length(2, 500, {
    message: 'Diagnosis summary must be between 2 and 500 characters',
  })
  diagnosis?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PrescriptionItemDto)
  prescriptions?: PrescriptionItemDto[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  recommendedTests?: string[];

  @IsOptional()
  @IsString()
  @Length(2, 500, {
    message: 'Treatment instructions must be between 2 and 500 characters',
  })
  treatmentInstructions?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'Follow-up date must be in YYYY-MM-DD format (e.g. 2026-11-27)',
  })
  followUpDate?: string;
}
