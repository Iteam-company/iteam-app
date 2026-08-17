import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { CompanyModule } from './company/company.module';
import { RolesModule } from './company/roles/roles.module';
import { MembersModule } from './company/members/members.module';
import { NotificationsModule } from './notifications/notifications.module';
import { WorkDaysModule } from './work-days/work-days.module';
import { ProjectsModule } from './projects/projects.module';
import { FinancesModule } from './finances/finances.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    CompanyModule,
    RolesModule,
    MembersModule,
    NotificationsModule,
    WorkDaysModule,
    ProjectsModule,
    FinancesModule,
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
