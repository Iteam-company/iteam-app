import { Type } from 'class-transformer';
import { IsInt } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateEdgeDto {
  @ApiProperty({ example: 10 })
  @Type(() => Number)
  @IsInt()
  sourceId: number;

  @ApiProperty({ example: 11 })
  @Type(() => Number)
  @IsInt()
  targetId: number;
}
