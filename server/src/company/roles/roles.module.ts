import { Module } from '@nestjs/common';
import { CompanyModule } from '../company.module';
import { RolesController } from './roles.controller';
import { RolesService } from './roles.service';

@Module({
  imports: [CompanyModule],
  controllers: [RolesController],
  providers: [RolesService],
})
export class RolesModule {}
