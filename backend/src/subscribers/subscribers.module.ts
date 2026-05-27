import { Module } from '@nestjs/common';
import { SubscribersService } from './subscribers.service';
import { SubscribersController } from './subscribers.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Subscriber, SubscriberSchema } from './schemas/subscriber.schema';
import { Skill, SkillSchema } from 'src/skills/schemas/skill.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Subscriber.name, schema: SubscriberSchema },
      { name: Skill.name, schema: SkillSchema },
    ]),
  ],
  controllers: [SubscribersController],
  providers: [SubscribersService],
  exports: [SubscribersService, SubscribersModule],
})
export class SubscribersModule {}
