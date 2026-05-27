import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UserCV, UserCVSchema } from './schemas/usercv.schema';
import { UserCVsService } from './usercvs.service';
import { UserCVsController } from './usercvs.controller';
import { AIMatchingModule } from 'src/ai-matching/ai-matching.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: UserCV.name, schema: UserCVSchema }]),
    AIMatchingModule,
  ],
  controllers: [UserCVsController],
  providers: [UserCVsService],
  exports: [UserCVsService],
})
export class UserCVsModule {}
