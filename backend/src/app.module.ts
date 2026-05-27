import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { BullModule } from '@nestjs/bull';
import { softDeletePlugin } from 'soft-delete-plugin-mongoose';

import { AppController } from './app.controller';
import { AppService } from './app.service';

// Modules
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { JobsModule } from './jobs/jobs.module';
import { CompaniesModule } from './companies/companies.module';
import { UserCVsModule } from './usercvs/usercvs.module';
import { ApplicationsModule } from './applications/applications.module';
import { FilesModule } from './files/files.module';
import { SkillsModule } from './skills/skills.module';
import { OtpsModule } from './otps/otps.module';
import { SubscribersModule } from './subscribers/subscribers.module';
import { MailModule } from './mail/mail.module';
import { CommentsModule } from './comments/comments.module';
import { NotificationsModule } from './notifications/notifications.module';
import { RedisModule } from './redis/redis.module';
import { AIMatchingModule } from './ai-matching/ai-matching.module';
import { OnlineCVsModule } from './online-cvs/online-cvs.module';

@Module({
  imports: [
    // Config
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // Throttle (Rate limiting)
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 100,
    }]),

    // Schedule (Cron jobs)
    ScheduleModule.forRoot(),

    // Bull Queue with Redis
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        redis: {
          host: configService.get<string>('REDIS_HOST') || 'localhost',
          port: configService.get<number>('REDIS_PORT') || 6379,
          password: configService.get<string>('REDIS_PASSWORD') || undefined,
        },
      }),
      inject: [ConfigService],
    }),

    // MongoDB
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('MONGODB_URI'),
        connectionFactory: (connection) => {
          connection.plugin(softDeletePlugin);
          return connection;
        },
      }),
      inject: [ConfigService],
    }),

    // Feature modules
    UsersModule,
    AuthModule,
    JobsModule,
    CompaniesModule,
    UserCVsModule,
    ApplicationsModule,
    FilesModule,
    SkillsModule,
    OtpsModule,
    SubscribersModule,
    MailModule,
    CommentsModule,
    NotificationsModule,
    RedisModule,
    AIMatchingModule,
    OnlineCVsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
