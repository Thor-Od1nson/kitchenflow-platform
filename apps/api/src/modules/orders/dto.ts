import { IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';
import type { OrderStatus } from '@kitchenflow/types';

export class ListOrdersDto {
  @IsOptional()
  @IsIn(['pending', 'accepted', 'preparing', 'dispatched', 'delivered', 'cancelled'])
  status?: OrderStatus;

  @IsOptional()
  @IsString()
  query?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit = 25;
}

export class UpdateOrderStatusDto {
  @IsIn(['pending', 'accepted', 'preparing', 'dispatched', 'delivered', 'cancelled'])
  status!: OrderStatus;
}
