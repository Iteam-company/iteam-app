import { ApiProperty } from '@nestjs/swagger';
import { AuthUserDto } from './auth-user.dto';

export class AuthResponseDto {
  @ApiProperty({ description: 'JWT bearer access token (short-lived, ~15m)' })
  accessToken: string;

  @ApiProperty({
    description: 'Refresh token — exchange via POST /auth/refresh',
  })
  refreshToken: string;

  @ApiProperty({ type: AuthUserDto })
  user: AuthUserDto;
}
