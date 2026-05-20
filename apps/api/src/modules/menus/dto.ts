import { IsArray, IsBoolean, IsString } from 'class-validator';

export class UpdateMenuAvailabilityDto {
  @IsArray()
  @IsString({ each: true })
  ids!: string[];

  @IsBoolean()
  available!: boolean;
}
