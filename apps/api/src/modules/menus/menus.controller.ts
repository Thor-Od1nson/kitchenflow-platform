import { Body, Controller, Get, Patch, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CurrentUser, type AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RbacGuard } from '../../common/guards/rbac.guard';
import { UpdateMenuAvailabilityDto } from './dto';
import { MenusService } from './menus.service';

@UseGuards(AuthGuard('jwt'), RbacGuard)
@Controller('menus')
export class MenusController {
  constructor(private readonly menus: MenusService) {}

  @Get()
  @Roles('owner', 'manager', 'kitchen', 'support')
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.menus.list(user.restaurantId);
  }

  @Patch('availability')
  @Roles('owner', 'manager')
  updateAvailability(@Body() body: UpdateMenuAvailabilityDto) {
    return this.menus.updateAvailability(body.ids, body.available);
  }

  @Post('sync')
  @Roles('owner', 'manager')
  sync() {
    return { accepted: true, job: 'menu-sync', queuedAt: new Date().toISOString() };
  }
}
