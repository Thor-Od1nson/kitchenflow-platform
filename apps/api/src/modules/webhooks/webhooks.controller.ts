import { Body, Controller, Get, Headers, Param, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Throttle } from '@nestjs/throttler';
import { CorrelationId } from '../../common/decorators/correlation-id.decorator';
import { CurrentUser, type AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RbacGuard } from '../../common/guards/rbac.guard';
import { WebhooksService } from './webhooks.service';

@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly webhooks: WebhooksService) {}

  @Post(':provider')
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  ingest(
    @Param('provider') provider: string,
    @Body() body: Record<string, unknown>,
    @Headers('x-kitchenflow-signature') signature?: string,
    @Headers('x-idempotency-key') idempotencyKey?: string,
    @CorrelationId() requestId?: string
  ) {
    return this.webhooks.ingest(provider, body, signature, idempotencyKey, requestId);
  }

  @UseGuards(AuthGuard('jwt'), RbacGuard)
  @Get()
  @Roles('owner', 'manager', 'support')
  list(@CurrentUser() user: AuthenticatedUser, @Query('limit') limit?: string) {
    return this.webhooks.list(user.restaurantId, Math.min(Number(limit) || 30, 100));
  }

  @UseGuards(AuthGuard('jwt'), RbacGuard)
  @Post(':id/retry')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Roles('owner', 'manager')
  retry(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @CorrelationId() requestId?: string) {
    return this.webhooks.retry(user.restaurantId, id, requestId);
  }

  @UseGuards(AuthGuard('jwt'), RbacGuard)
  @Post(':id/replay')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Roles('owner', 'manager')
  replay(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @CorrelationId() requestId?: string) {
    return this.webhooks.replay(user.restaurantId, id, requestId);
  }
}
