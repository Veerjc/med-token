import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    // Asynchronously configure JwtModule using runtime environment variables
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>(
          'JWT_ACCESS_SECRET',
          'development_jwt_access_secret_key_minimum_32_characters_long',
        ),
        signOptions: {
          expiresIn: config.get<string>('JWT_ACCESS_EXPIRATION', '15m') as any,
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, JwtAuthGuard, RolesGuard],
  exports: [AuthService, JwtModule, PassportModule, JwtAuthGuard, RolesGuard],
})
export class AuthModule {}

/**
 * 1. Dynamic Asynchronous Configuration (JwtModule.registerAsync):
 * Injects ConfigService rather than reading static environment variables, ensuring that values from .env (validated by Joi in env.validation.ts) are fully loaded before JWT secrets are initialized.
 * Provides a safe, typed 32+ character fallback for development if JWT_ACCESS_SECRET is not provided.
 * 2. Global Module Synergies:
 * Both PrismaModule and RedisModule are decorated with @Global(), which means AuthModule automatically has access to PrismaService and RedisService without repetitive imports.
 * 3. Module Exports:
 * Exports both AuthService and JwtModule so upcoming modules in later stages (such as PassportStrategy, JwtAuthGuard, and clinic onboarding services) can reuse the token signing and authentication checks.
 */

/**
 * 
 * PassportModule.register({ defaultStrategy: 'jwt' }): Configures NestJS's security pipeline to use JWT as the default authentication scheme.

  
providers: [..., JwtStrategy, JwtAuthGuard]: Registers the strategy class so Passport can instantiate it with PrismaService and ConfigService.

  
exports: [..., PassportModule, JwtAuthGuard]: Exports the guard so other feature modules (like Doctors, Clinics, and Tokens) can protect their endpoints with @UseGuards(JwtAuthGuard).
 */
