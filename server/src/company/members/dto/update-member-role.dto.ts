import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateMemberRoleDto {
  @ApiProperty({ example: 'ADMIN', enum: ['USER', 'ADMIN'] })
  @IsString()
  @IsNotEmpty()
  role: 'USER' | 'ADMIN';
}
