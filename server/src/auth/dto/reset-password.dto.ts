import { IsNotEmpty, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ResetPasswordDto {
  @ApiProperty({ description: 'Reset token received from forgot-password' })
  @IsString()
  @IsNotEmpty()
  token: string;

  @ApiProperty({ example: 'NewP@ssw0rd!', minLength: 8 })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({ example: 'NewP@ssw0rd!' })
  @IsString()
  @MinLength(8)
  repeatPassword: string;
}
