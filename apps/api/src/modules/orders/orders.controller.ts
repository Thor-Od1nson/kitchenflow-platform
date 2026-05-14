import { Body, Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../../common/decorators/roles.decorator';
import { RbacGuard } from '../../common/guards/rbac.guard';
import { ListOrdersDto, UpdateOrderStatusDto } from './dto';
import { OrdersService } from './orders.service';

@UseGuards(AuthGuard('jwt'), RbacGuard)
@Controller('orders')
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Get()
  @Roles('owner', 'admin', 'ops_manager', 'store_manager', 'chef')
  list(@Query() query: ListOrdersDto) {
    return this.orders.list(query);
  }

  @Patch(':id/status')
  @Roles('owner', 'admin', 'ops_manager', 'store_manager', 'chef')
  updateStatus(@Param('id') id: string, @Body() dto: UpdateOrderStatusDto) {
    return this.orders.updateStatus(id, dto.status);
  }
}
