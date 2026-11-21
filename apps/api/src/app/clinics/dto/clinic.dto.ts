import { FacilityDisplayType } from '@medical-proj/shared-models';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Matches,
  Max,
  Min,
} from 'class-validator';

export class CreateOrganizationDto {
  @IsNotEmpty({ message: 'Organization name is required' })
  @IsString()
  @Length(3, 100, { message: 'Name must be between 3 and 100 characters' })
  name!: string;

  @IsNotEmpty({ message: 'Slug is required' })
  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'Slug must be lowercase alphanumeric with hyphens (e.g. apollo-clinic)',
  })
  slug!: string;

  @IsNotEmpty({ message: 'Facility display type is required' })
  @IsEnum(FacilityDisplayType, {
    message: 'displayType must be CLINIC, HOSPITAL, or BRANCH',
  })
  displayType!: FacilityDisplayType;

  @IsNotEmpty({ message: 'Contact phone is required' })
  @IsString()
  @Matches(/^\+[1-9]\d{7,14}$/, {
    message: 'Phone must be a valid E.164 number (e.g. +919876543210)',
  })
  contactPhone!: string;

  @IsNotEmpty({ message: 'Contact email is required' })
  @IsEmail({}, { message: 'Invalid email format' })
  contactEmail!: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(25)
  platformFeePercent?: number;

  @IsOptional()
  @IsString()
  referralCode?: string;
}

export class CreateClinicDto {
  @IsNotEmpty({ message: 'Organization ID is required' })
  @IsString()
  organizationId!: string;

  @IsNotEmpty({ message: 'Clinic name is required' })
  @IsString()
  @Length(3, 100)
  name!: string;

  @IsNotEmpty({ message: 'Clinic QR slug is required' })
  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'QR slug must be lowercase alphanumeric with hyphens (e.g. apollo-koramangala)',
  })
  clinicQrSlug!: string;

  @IsNotEmpty({ message: 'City is required' })
  @IsString()
  city!: string;

  @IsNotEmpty({ message: 'Address is required' })
  @IsString()
  address!: string;

  @IsOptional()
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @IsNumber()
  longitude?: number;

  @IsOptional()
  @IsString()
  @Matches(/^\+[1-9]\d{7,14}$/, {
    message: 'Phone must be a valid E.164 number (e.g. +919876543210)',
  })
  contactPhone?: string;
}

export class CreateClinicHolidayDto {
  @IsNotEmpty({ message: 'Date is required' })
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'Date must be in YYYY-MM-DD format (e.g. 2026-12-25)',
  })
  date!: string;

  @IsNotEmpty({ message: 'Reason is required' })
  @IsString()
  @Length(3, 120, { message: 'Reason must be between 3 and 120 characters' })
  reason!: string;
}

/**
 * 
 * 
 * @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/):
Enforces clean URL slugs (e.g., care-clinic-indiranagar). This prevents spaces, uppercase letters, or special characters so physical QR codes and web links resolve without encoding issues.

  
FacilityDisplayType:
Reuses our shared enum (CLINIC, HOSPITAL, BRANCH) from @medical-proj/shared-models.

  
referralCode:
Captures partner onboarding agent codes (e.g. AGT-BLR-01) for partner commission tracking.

  
platformFeePercent:
Restricted to 0% to 10% (@Min(0), @Max(10)), with default 3% per ADR-008.
*/
