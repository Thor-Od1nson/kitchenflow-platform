import { IsISO8601, IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import type { Channel, OrderStatus } from '@kitchenflow/types';

export class ListOrdersDto {
  @IsOptional()
  @IsIn(['pending', 'accepted', 'preparing', 'dispatched', 'delivered', 'cancelled'])
  status?: OrderStatus;

  @IsOptional()
  @IsIn(['swiggy', 'zomato', 'uber_eats', 'deliveroo', 'talabat', 'doordash', 'direct'])
  channel?: Channel;

  @IsOptional()
  @IsString()
  outletId?: string;

  @IsOptional()
  @IsISO8601()
  dateFrom?: string;

  @IsOptional()
  @IsISO8601()
  dateTo?: string;

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
  @Max(100)
  limit = 25;
}

export class UpdateOrderStatusDto {
  @IsIn(['pending', 'accepted', 'preparing', 'dispatched', 'delivered', 'cancelled'])
  status!: OrderStatus;
}
