import { Module } from '@nestjs/common';
import { CompanyModule } from '../company/company.module';
import { FinancesController } from './finances.controller';
import { FinancesService } from './finances.service';

@Module({
  imports: [CompanyModule],
  controllers: [FinancesController],
  providers: [FinancesService],
})
export class FinancesModule {}
