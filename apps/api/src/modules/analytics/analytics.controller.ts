import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CurrentUser, type AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RbacGuard } from '../../common/guards/rbac.guard';
import { AnalyticsService } from './analytics.service';

@UseGuards(AuthGuard('jwt'), RbacGuard)
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  @Get('summary')
  @Roles('owner', 'admin', 'ops_manager', 'analyst')
  summary(@CurrentUser() user: AuthenticatedUser) {
    return this.analytics.summary(user.restaurantId);
  }
}
