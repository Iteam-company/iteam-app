import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateMemberOccupationDto {
  @ApiProperty({ example: 'Розробник' })
  @IsString()
  @IsNotEmpty()
  occupation: string;
}
