import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../../common/decorators/roles.decorator';
import { RbacGuard } from '../../common/guards/rbac.guard';
import { AnalyticsService } from './analytics.service';

@UseGuards(AuthGuard('jwt'), RbacGuard)
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  @Get('summary')
  @Roles('owner', 'admin', 'ops_manager', 'analyst')
  summary(@Query('restaurantId') restaurantId: string) {
    return this.analytics.summary(restaurantId);
  }
}
