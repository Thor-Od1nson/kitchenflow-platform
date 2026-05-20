import { IsIn, IsInt, IsISO8601, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class ListAuditDto {
  @IsOptional()
  @IsString()
  query?: string;

  @IsOptional()
  @IsString()
  outletId?: string;

  @IsOptional()
  @IsString()
  entityType?: string;

  @IsOptional()
  @IsString()
  actorUserId?: string;

  @IsOptional()
  @IsIn(['owner', 'manager', 'kitchen', 'support'])
  actorRole?: string;

  @IsOptional()
  @IsIn(['info', 'warning', 'error', 'critical'])
  severity?: string;

  @IsOptional()
  @IsString()
  operationType?: string;

  @IsOptional()
  @IsISO8601()
  dateFrom?: string;

  @IsOptional()
  @IsISO8601()
  dateTo?: string;

  @IsOptional()
  @IsIn(['auth.login', 'auth.logout', 'auth.failed', 'order.created', 'order.status_changed', 'inventory.adjusted', 'inventory.low_stock'])
  action?: string;

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
