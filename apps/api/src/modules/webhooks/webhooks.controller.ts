import { Body, Controller, Get, Headers, Param, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CurrentUser, type AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RbacGuard } from '../../common/guards/rbac.guard';
import { WebhooksService } from './webhooks.service';

@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly webhooks: WebhooksService) {}

  @Post(':provider')
  ingest(
    @Param('provider') provider: string,
    @Body() body: Record<string, unknown>,
    @Headers('x-kitchenflow-signature') signature?: string,
    @Headers('x-idempotency-key') idempotencyKey?: string
  ) {
    return this.webhooks.ingest(provider, body, signature, idempotencyKey);
  }

  @UseGuards(AuthGuard('jwt'), RbacGuard)
  @Get()
  @Roles('owner', 'manager', 'support')
  list(@CurrentUser() user: AuthenticatedUser, @Query('limit') limit?: string) {
    return this.webhooks.list(user.restaurantId, Math.min(Number(limit) || 30, 100));
  }

  @UseGuards(AuthGuard('jwt'), RbacGuard)
  @Post(':id/retry')
  @Roles('owner', 'manager')
  retry(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.webhooks.retry(user.restaurantId, id);
  }

  @UseGuards(AuthGuard('jwt'), RbacGuard)
  @Post(':id/replay')
  @Roles('owner', 'manager')
  replay(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.webhooks.replay(user.restaurantId, id);
  }
}
