import { Type } from 'class-transformer';
import { IsNumber, IsOptional, Max, Min } from 'class-validator';

export class SimulateAggregatorDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(20)
  count = 3;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(0.8)
  failureRate = 0.15;
}
