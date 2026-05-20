import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CorrelationId } from '../../common/decorators/correlation-id.decorator';
import { CurrentUser, type AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RbacGuard } from '../../common/guards/rbac.guard';
import { AggregatorService } from './aggregator.service';
import { SimulateAggregatorDto } from './dto';

@UseGuards(AuthGuard('jwt'), RbacGuard)
@Controller('aggregator')
export class AggregatorController {
  constructor(private readonly aggregator: AggregatorService) {}

  @Post('simulate')
  @Roles('owner', 'manager')
  simulate(@CurrentUser() user: AuthenticatedUser, @Body() body: SimulateAggregatorDto, @CorrelationId() requestId?: string) {
    return this.aggregator.simulate(user.restaurantId, {
      count: body.count,
      failureRate: body.failureRate,
      requestId
    });
  }
}
