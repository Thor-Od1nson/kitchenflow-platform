import type { Role } from '@kitchenflow/types';

export interface RequestContext {
  correlationId?: string;
  user?: {
    userId: string;
    restaurantId: string;
    role: Role;
  };
}

export type RequestWithContext = {
  method: string;
  originalUrl: string;
  headers: Record<string, string | string[] | undefined>;
  correlationId?: string;
  user?: RequestContext['user'];
};
