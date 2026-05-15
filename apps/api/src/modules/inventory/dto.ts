import { IsNumber, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class AdjustInventoryDto {
  @Type(() => Number)
  @IsNumber()
  @Min(-10000)
  @Max(10000)
  delta!: number;

  @IsString()
  reason!: string;
}
