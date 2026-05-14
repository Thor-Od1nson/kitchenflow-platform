import { Body, Controller, Get, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../../common/decorators/roles.decorator';
import { RbacGuard } from '../../common/guards/rbac.guard';
import { MenusService } from './menus.service';

@UseGuards(AuthGuard('jwt'), RbacGuard)
@Controller('menus')
export class MenusController {
  constructor(private readonly menus: MenusService) {}

  @Get()
  @Roles('owner', 'admin', 'ops_manager', 'store_manager')
  list(@Query('restaurantId') restaurantId: string) {
    return this.menus.list(restaurantId);
  }

  @Patch('availability')
  @Roles('owner', 'admin', 'ops_manager', 'store_manager')
  updateAvailability(@Body() body: { ids: string[]; available: boolean }) {
    return this.menus.updateAvailability(body.ids, body.available);
  }

  @Post('sync')
  @Roles('owner', 'admin', 'ops_manager')
  sync() {
    return { accepted: true, job: 'menu-sync', queuedAt: new Date().toISOString() };
  }
}
