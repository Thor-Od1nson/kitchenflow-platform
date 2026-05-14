import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Role } from '@kitchenflow/types';

export interface AuthenticatedUser {
  userId: string;
  restaurantId: string;
  role: Role;
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthenticatedUser => {
    const request = context.switchToHttp().getRequest<{ user: AuthenticatedUser }>();
    return request.user;
  }
);
