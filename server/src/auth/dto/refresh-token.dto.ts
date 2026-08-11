import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/** Used for both refreshing a session and signing out of one. */
export class RefreshTokenDto {
  @ApiProperty({ description: 'The refresh token issued at sign-in/sign-up' })
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}
