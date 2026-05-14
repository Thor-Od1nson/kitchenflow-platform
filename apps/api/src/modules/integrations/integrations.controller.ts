import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CurrentUser, type AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RbacGuard } from '../../common/guards/rbac.guard';
import { IntegrationsService } from './integrations.service';

@UseGuards(AuthGuard('jwt'), RbacGuard)
@Controller('integrations')
export class IntegrationsController {
  constructor(private readonly integrations: IntegrationsService) {}

  @Get()
  @Roles('owner', 'admin', 'ops_manager')
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.integrations.list(user.restaurantId);
  }

  @Post(':provider/test')
  @Roles('owner', 'admin')
  test(@Param('provider') provider: string) {
    return this.integrations.test(provider);
  }
}
