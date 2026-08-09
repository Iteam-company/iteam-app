import { Module } from '@nestjs/common';
import { CompanyController } from './company.controller';
import { CompanyService } from './company.service';
import { CompanyAccessService } from './company-access.service';

@Module({
  controllers: [CompanyController],
  providers: [CompanyService, CompanyAccessService],
  exports: [CompanyService, CompanyAccessService],
})
export class CompanyModule {}
