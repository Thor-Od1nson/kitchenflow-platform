import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CurrentUser, type AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RbacGuard } from '../../common/guards/rbac.guard';
import { PayoutsService } from './payouts.service';

@UseGuards(AuthGuard('jwt'), RbacGuard)
@Controller('payouts')
export class PayoutsController {
  constructor(private readonly payouts: PayoutsService) {}

  @Post('reconcile')
  @Roles('owner', 'manager')
  reconcile(@CurrentUser() user: AuthenticatedUser) {
    return this.payouts.reconcile(user.restaurantId);
  }

  @Get('reconciliation')
  @Roles('owner', 'manager', 'support')
  summary(@CurrentUser() user: AuthenticatedUser) {
    return this.payouts.summary(user.restaurantId);
  }
}
