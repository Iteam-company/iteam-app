import { Module } from '@nestjs/common';
import { CompanyModule } from '../company.module';
import { MembersController } from './members.controller';
import { MembersService } from './members.service';

@Module({
  imports: [CompanyModule],
  controllers: [MembersController],
  providers: [MembersService],
})
export class MembersModule {}
