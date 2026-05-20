import type { Role } from '@kitchenflow/types';

export interface RequestContext {
  requestId?: string;
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
  route?: { path?: string };
  headers: Record<string, string | string[] | undefined>;
  requestId?: string;
  correlationId?: string;
  user?: RequestContext['user'];
};
