import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;
    // If a specific property is requested (e.g. @CurrentUser('id')), return only that field
    return data ? user?.[data] : user;
  },
);

/**
 * 
 * Full Object Extraction: @CurrentUser() user retrieves the entire verified user payload (id, name, phone, role, clinicId).
Selective Field Extraction: @CurrentUser('id') userId: string or @CurrentUser('role') role: string retrieves just that specific property directly.
Decoupled from Express: Abstracting request.user behind a param decorator makes unit testing controllers trivial because you can pass mock user objects directly in tests without mocking the full HTTP request.
*/
