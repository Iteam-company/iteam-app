import { IsArray, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class BulkCreateRolesDto {
  @ApiProperty({ example: ['Менеджер', 'Розробник', 'Дизайнер'] })
  @IsArray()
  @IsString({ each: true })
  names: string[];
}
