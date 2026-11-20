import { IsEmail, IsNotEmpty, IsString, Length, Matches } from 'class-validator';

export class SendOtpDto {
  @IsNotEmpty({
    message: 'Phone number is required',
  })
  @IsString()
  @Matches(/^\+[1-9]\d{7,14}$/, {
    message: 'Phone number must be a valid E.164 format (e.g. +919876543210)',
  })
  phone!: string;
}

export class VerifyOtpDto {
  @IsNotEmpty({
    message: 'Phone number is required',
  })
  @IsString()
  @Matches(/^\+[1-9]\d{7,14}$/, {
    message: 'Phone number must be a valid E.164 format (e.g. +919876543210)',
  })
  phone!: string;

  @IsNotEmpty({ message: 'OTP is required' })
  @IsString()
  @Length(6, 6, { message: 'OTP must be exactly 6 digits' })
  @Matches(/^\d{6}$/, { message: 'OTP must contain only numbers' })
  otp!: string;
}

export class LoginDto {
  @IsNotEmpty({ message: 'Email is required' })
  @IsEmail({}, { message: 'Invalid email address format' })
  email!: string;

  @IsNotEmpty({ message: 'Password is required' })
  @IsString()
  @Length(8, 100, { message: 'Password must be between 8 and 100 characters' })
  password!: string;
}
