import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { OnlineCVsController } from './online-cvs.controller';
import { OnlineCVsService } from './online-cvs.service';
import { OnlineCV, OnlineCVSchema } from './schemas/online-cv.schema';
import { FilesModule } from 'src/files/files.module';
import { UserCVsModule } from 'src/usercvs/usercvs.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: OnlineCV.name, schema: OnlineCVSchema }]),
    FilesModule,
    forwardRef(() => UserCVsModule),
  ],
  controllers: [OnlineCVsController],
  providers: [OnlineCVsService],
  exports: [OnlineCVsService],
})
export class OnlineCVsModule {}
