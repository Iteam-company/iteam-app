import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { CompanyModule } from './company/company.module';
import { NotificationsModule } from './notifications/notifications.module';
import { WorkDaysModule } from './work-days/work-days.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    CompanyModule,
    NotificationsModule,
    WorkDaysModule,
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
