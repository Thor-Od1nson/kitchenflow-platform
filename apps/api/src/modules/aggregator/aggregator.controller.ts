import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CurrentUser, type AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RbacGuard } from '../../common/guards/rbac.guard';
import { AggregatorService } from './aggregator.service';

@UseGuards(AuthGuard('jwt'), RbacGuard)
@Controller('aggregator')
export class AggregatorController {
  constructor(private readonly aggregator: AggregatorService) {}

  @Post('simulate')
  @Roles('owner', 'manager')
  simulate(@CurrentUser() user: AuthenticatedUser, @Body() body: { count?: number; failureRate?: number }) {
    return this.aggregator.simulate(user.restaurantId, {
      count: Math.min(Math.max(body.count ?? 3, 1), 20),
      failureRate: Math.min(Math.max(body.failureRate ?? 0.15, 0), 0.8)
    });
  }
}
