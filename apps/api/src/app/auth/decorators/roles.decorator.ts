import { UserRole } from '@medical-proj/shared-models';
import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

export const Roles = (...roles: (UserRole | `${UserRole}`)[]) => SetMetadata(ROLES_KEY, roles);

/**
 * export const ROLES_KEY = 'roles':
A constant metadata key used by NestJS's Reflector. Our upcoming RolesGuard will use this exact key to read which roles are permitted on a given route.

  
...roles: (UserRole |${UserRole})[]):
Accepts one or more roles from our shared domain enums in @medical-proj/shared-models. This gives you full compile-time autocompletion and safety for all 6 MedToken roles:
  
  

  
SUPER_ADMIN

  
ONBOARDING_PARTNER

  
CLINIC_ADMIN

  
DOCTOR

  
RECEPTIONIST

  
PATIENT

  

  
SetMetadata(ROLES_KEY, roles):
Attaches the allowed roles array directly to the route handler's reflection metadata without modifying runtime performance.
 * */
