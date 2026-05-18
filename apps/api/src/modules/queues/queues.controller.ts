import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
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
  @Roles('owner', 'manager')
  scan(@CurrentUser() user: AuthenticatedUser) {
    return this.queues.enqueueSlaScan(user.restaurantId, 0);
  }

  @Get('metrics')
  @Roles('owner')
  metrics() {
    return this.queues.metrics();
  }

  @Post('test-failure')
  @Roles('owner')
  testFailure(@CurrentUser() user: AuthenticatedUser) {
    return this.queues.enqueueTestFailure(user.restaurantId);
  }
}
