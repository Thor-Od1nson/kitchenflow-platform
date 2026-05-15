import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CorrelationId } from '../../common/decorators/correlation-id.decorator';
import { CurrentUser, type AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RbacGuard } from '../../common/guards/rbac.guard';
import { CreateOrderDto, ListOrdersDto, UpdateOrderStatusDto } from './dto';
import { OrdersService } from './orders.service';

@UseGuards(AuthGuard('jwt'), RbacGuard)
@Controller('orders')
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Get()
  @Roles('owner', 'manager', 'kitchen', 'support')
  list(@CurrentUser() user: AuthenticatedUser, @Query() query: ListOrdersDto) {
    return this.orders.list(user.restaurantId, query);
  }

  @Post()
  @Roles('owner', 'manager', 'kitchen')
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateOrderDto, @CorrelationId() correlationId?: string) {
    return this.orders.create(user, dto, correlationId);
  }

  @Patch(':id/status')
  @Roles('owner', 'manager', 'kitchen')
  updateStatus(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateOrderStatusDto, @CorrelationId() correlationId?: string) {
    return this.orders.updateStatus(user, id, dto.status, dto.expectedUpdatedAt, correlationId);
  }
}
