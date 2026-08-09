import { IsArray, IsEmail } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class InviteUsersDto {
  @ApiProperty({ example: ['alice@company.ua', 'bob@company.ua'] })
  @IsArray()
  @IsEmail({}, { each: true })
  emails: string[];
}
