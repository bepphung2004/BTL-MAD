import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Application, ApplicationSchema } from './schemas/application.schema';
import { ApplicationsService } from './applications.service';
import { ApplicationsController } from './applications.controller';
import { UsersModule } from 'src/users/users.module';
import { UserCVsModule } from 'src/usercvs/usercvs.module';
import { NotificationsModule } from 'src/notifications/notifications.module';
import { AIMatchingModule } from 'src/ai-matching/ai-matching.module';
import { JobsModule } from 'src/jobs/jobs.module';
import { CVMatchResult, CVMatchResultSchema } from 'src/ai-matching/schemas/cv-match-result.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Application.name, schema: ApplicationSchema },
      {name: CVMatchResult.name, schema: CVMatchResultSchema}
    ]),
    forwardRef(() => UsersModule),
    forwardRef(() => JobsModule),
    NotificationsModule,
    UserCVsModule,
    AIMatchingModule,
  ],
  controllers: [ApplicationsController],
  providers: [ApplicationsService],
  exports: [ApplicationsService],
})
export class ApplicationsModule {}
