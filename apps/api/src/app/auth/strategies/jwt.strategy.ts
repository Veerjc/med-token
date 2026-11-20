import {
  Injectable,
  Logger,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../prisma/prisma.service';

export interface JwtPayload {
  sub: string;
  role: string;
  iat?: number;
  exp?: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);
  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>(
        'JWT_ACCESS_SECRET',
        'development_jwt_access_secret_key_minimum_32_characters_long',
      ),
    });
  }

  async validate(payload: JwtPayload) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: {
          id: true,
          phone: true,
          email: true,
          name: true,
          role: true,
          organizationId: true,
          clinicId: true,
          isActive: true,
        },
      });
      if (!user || !user.isActive) {
        throw new UnauthorizedException('User account is invalid or deactivated');
      }
      return user;
    } catch (error) {
      // Re-throw genuine 401s (user deactivated or deleted)
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      // Log database outage and return a clean HTTP 503 instead of an unhandled crash
      this.logger.error(
        `Database connection error during token validation: ${(error as Error).message}`,
      );
      throw new ServiceUnavailableException(
        'Authentication service is temporarily unavailable. Please retry shortly.',
      );
    }
  }
}

/**
 * 
 * ExtractJwt.fromAuthHeaderAsBearerToken():
Automatically intercepts the HTTP request and extracts the token from the header: Authorization: Bearer <jwt_token>. If the header is missing, Passport immediately rejects the request with HTTP 401 Unauthorized.

  
ignoreExpiration: false:
Ensures tokens that are older than 15 minutes are strictly rejected as expired.

  
validate(payload: JwtPayload):
  
  

  
Passport automatically verifies the cryptographic signature with secretOrKey before calling validate().

  
payload.sub is the user's unique CUID ID.

  
We query PostgreSQL to ensure the user still exists and hasn't been deactivated (isActive: true).

  
Using select: { ... } ensures passwordHash is never pulled into memory.

  
Whatever object is returned by validate() is automatically attached to req.user in all downstream controllers and guards!
 */
