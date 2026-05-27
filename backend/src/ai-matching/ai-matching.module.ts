import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BullModule } from '@nestjs/bull';
import { AIMatchingService } from './ai-matching.service';
import { CVProcessingService } from './cv-processing.service';
import { CVProcessingProcessor } from './cv-processing.processor';
import { CVMatchResult, CVMatchResultSchema } from './schemas/cv-match-result.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: CVMatchResult.name, schema: CVMatchResultSchema },
    ]),
    BullModule.registerQueue({
      name: 'cv-processing',
    }),
  ],
  providers: [AIMatchingService, CVProcessingService, CVProcessingProcessor],
  exports: [AIMatchingService, CVProcessingService],
})
export class AIMatchingModule {}
