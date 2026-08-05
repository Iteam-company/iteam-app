import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { CompanyModule } from './company/company.module';
import { BoardsModule } from './boards/boards.module';
import { TasksModule } from './tasks/tasks.module';
import { NotificationsModule } from './notifications/notifications.module';
import { WorkDaysModule } from './work-days/work-days.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    CompanyModule,
    BoardsModule,
    TasksModule,
    NotificationsModule,
    WorkDaysModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
