import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@medical-proj/shared-models';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // 1. Read required roles from both the method and the controller class
    const requiredRoles = this.reflector.getAllAndOverride<(UserRole | `${UserRole}`)[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // 2. If no @Roles() decorator is present on the route, allow access
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    // 3. Extract the authenticated user from the HTTP request (populated by JwtAuthGuard)
    const { user } = context.switchToHttp().getRequest();

    if (!user || !user.role) {
      throw new ForbiddenException('Access denied: User identity or role could not be verified.');
    }

    // 4. Verify if the user's role is in the authorized roles list
    const hasRole = requiredRoles.includes(user.role);

    if (!hasRole) {
      throw new ForbiddenException(
        `Access denied: This endpoint requires one of the following roles: [${requiredRoles.join(
          ', ',
        )}], but your current role is '${user.role}'.`,
      );
    }

    return true;
  }
}

/*
this.reflector.getAllAndOverride(...):
Inspects both the method (@Get(), @Post()) and the entire controller class (@Controller()). If a controller has @Roles(UserRole.DOCTOR) at the class level, all methods inherit it, but individual methods can override it.

  
if (!requiredRoles) return true:
If an endpoint only has @UseGuards(JwtAuthGuard) without @Roles(...), it stays open to any authenticated user (e.g. GET /api/auth/me).

  
ForbiddenException (HTTP 403):
If a PATIENT tries to call a doctor's queue management route or a receptionist's payment endpoint, the guard cleanly blocks them with HTTP 403 Forbidden and a descriptive message.
*/
