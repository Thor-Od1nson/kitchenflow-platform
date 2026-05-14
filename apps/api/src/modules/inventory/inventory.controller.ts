import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../../common/decorators/roles.decorator';
import { RbacGuard } from '../../common/guards/rbac.guard';
import { InventoryService } from './inventory.service';

@UseGuards(AuthGuard('jwt'), RbacGuard)
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventory: InventoryService) {}

  @Get(':outletId')
  @Roles('owner', 'admin', 'ops_manager', 'store_manager')
  list(@Param('outletId') outletId: string) {
    return this.inventory.list(outletId);
  }
}
