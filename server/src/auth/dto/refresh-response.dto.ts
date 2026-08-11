import { ApiProperty } from '@nestjs/swagger';

export class RefreshResponseDto {
  @ApiProperty({ description: 'New JWT bearer access token' })
  accessToken: string;

  @ApiProperty({
    description: 'New refresh token — the old one is now revoked',
  })
  refreshToken: string;
}
