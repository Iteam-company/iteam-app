import { ApiProperty } from '@nestjs/swagger';
import { AuthUserDto } from './auth-user.dto';

export class AuthResponseDto {
  @ApiProperty({ description: 'JWT bearer access token' })
  accessToken: string;

  @ApiProperty({ type: AuthUserDto })
  user: AuthUserDto;
}
