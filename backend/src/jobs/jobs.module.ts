import { forwardRef, Module } from '@nestjs/common';
import { JobsService } from './jobs.service';
import { JobsController } from './jobs.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Job, JobSchema } from './schemas/job.schema';
import { RedisModule } from 'src/redis/redis.module';
import { UsersModule } from 'src/users/users.module';
import { Company, CompanySchema } from 'src/companies/schemas/company.schema';
import { ApplicationSchema } from 'src/applications/schemas/application.schema';
import { NotificationsModule } from 'src/notifications/notifications.module';
import { AIMatchingModule } from 'src/ai-matching/ai-matching.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Job.name, schema: JobSchema },{ name: Company.name, schema: CompanySchema }, {name: "Application", schema: ApplicationSchema}]),
    RedisModule,
    NotificationsModule,
    AIMatchingModule,
    forwardRef(() => UsersModule),
  ],
  controllers: [JobsController],
  providers: [JobsService],
  exports: [JobsService, JobsModule],
})
export class JobsModule {}
