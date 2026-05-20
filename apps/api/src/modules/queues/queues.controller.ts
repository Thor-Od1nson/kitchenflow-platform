import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Throttle } from '@nestjs/throttler';
import { CorrelationId } from '../../common/decorators/correlation-id.decorator';
import { CurrentUser, type AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RbacGuard } from '../../common/guards/rbac.guard';
import { QueuesService } from './queues.service';

@UseGuards(AuthGuard('jwt'), RbacGuard)
@Controller('queues')
export class QueuesController {
  constructor(private readonly queues: QueuesService) {}

  @Get('activity')
  @Roles('owner', 'manager', 'support')
  activity(@CurrentUser() user: AuthenticatedUser) {
    return this.queues.recentActivity(user.restaurantId);
  }

  @Post('sla-scan')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Roles('owner', 'manager')
  scan(@CurrentUser() user: AuthenticatedUser, @CorrelationId() requestId?: string) {
    return this.queues.enqueueSlaScan(user.restaurantId, 0, requestId);
  }

  @Get('metrics')
  @Roles('owner')
  metrics() {
    return this.queues.metrics();
  }

  @Post('test-failure')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Roles('owner')
  testFailure(@CurrentUser() user: AuthenticatedUser, @CorrelationId() requestId?: string) {
    return this.queues.enqueueTestFailure(user.restaurantId, requestId);
  }

  @Get('dlq')
  @Roles('owner')
  dlq() {
    return this.queues.dlq();
  }

  @Post('dlq/:id/retry')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Roles('owner')
  retryDlq(@Param('id') id: string, @CorrelationId() requestId?: string) {
    return this.queues.retryDlqJob(id, requestId);
  }
}
