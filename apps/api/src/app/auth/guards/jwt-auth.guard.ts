import { ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  override handleRequest<TUser = any>(
    err: any,
    user: any,
    info: any,
    context: ExecutionContext,
    status?: any,
  ): TUser {
    if (err || !user) {
      throw (
        err ||
        new UnauthorizedException(
          info?.message || 'Authentication required. Please provide a valid Bearer token.',
        )
      );
    }
    return user;
  }
}

/**
 * 
 * Clean Syntax: Instead of using magic strings like @UseGuards(AuthGuard('jwt')), you write type-safe @UseGuards(JwtAuthGuard).
Helpful Error Messages: Standard Passport returns a blank 401. Overriding handleRequest extracts info.message (e.g. "jwt expired", "jwt malformed") so clients understand why the token was rejected, matching our specification in api-details.md.
 */
