import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CurrentUser, type AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RbacGuard } from '../../common/guards/rbac.guard';
import { AuditLogService } from './audit.service';
import { ListAuditDto } from './dto';

@UseGuards(AuthGuard('jwt'), RbacGuard)
@Controller('audit')
export class AuditController {
  constructor(private readonly audit: AuditLogService) {}

  @Get()
  @Roles('owner', 'manager', 'support')
  list(@CurrentUser() user: AuthenticatedUser, @Query() query: ListAuditDto) {
    return this.audit.list(user.restaurantId, query);
  }
}
