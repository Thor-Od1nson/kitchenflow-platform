import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CorrelationId } from '../../common/decorators/correlation-id.decorator';
import { CurrentUser, type AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RbacGuard } from '../../common/guards/rbac.guard';
import { AdjustInventoryDto } from './dto';
import { InventoryService } from './inventory.service';

@UseGuards(AuthGuard('jwt'), RbacGuard)
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventory: InventoryService) {}

  @Get()
  @Roles('owner', 'manager', 'support')
  listDefault(@CurrentUser() user: AuthenticatedUser) {
    return this.inventory.listDefault(user.restaurantId);
  }

  @Get(':outletId')
  @Roles('owner', 'manager', 'support')
  list(@CurrentUser() user: AuthenticatedUser, @Param('outletId') outletId: string) {
    return this.inventory.list(user.restaurantId, outletId);
  }

  @Patch(':outletId/items/:itemId/adjust')
  @Roles('owner', 'manager')
  adjust(
    @CurrentUser() user: AuthenticatedUser,
    @Param('outletId') outletId: string,
    @Param('itemId') itemId: string,
    @Body() dto: AdjustInventoryDto,
    @CorrelationId() correlationId?: string
  ) {
    return this.inventory.adjust(user, outletId, itemId, dto, correlationId);
  }
}
