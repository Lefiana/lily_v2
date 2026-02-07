// apps/backend/src/core/decorators/active-user.decorator.ts
import {
  createParamDecorator,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';

export const ActiveUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();

    // The library usually populates req.user if the session is valid
    const user = request.user;

    if (!user) {
      throw new UnauthorizedException('User not found in request context');
    }

    return data ? user[data as string] : user;
  },
);
