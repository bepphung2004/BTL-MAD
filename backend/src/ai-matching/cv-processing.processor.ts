import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AIMatchingService } from './ai-matching.service';
import { CVMatchResult, CVMatchResultDocument, CVProcessingStatus } from './schemas/cv-match-result.schema';

export interface CVProcessingJobData {
  cvMatchResultId: string;
  cvText: string; // Pre-parsed text from DB (no re-download needed)
  jobId: string;
  jobName: string;
  jobDescription: string;
  jobSkills: string[];
  jobLevel: string;
}

@Processor('cv-processing')
export class CVProcessingProcessor {
  private readonly logger = new Logger(CVProcessingProcessor.name);

  constructor(
    private readonly aiMatchingService: AIMatchingService,
    @InjectModel(CVMatchResult.name)
    private readonly cvMatchResultModel: Model<CVMatchResultDocument>,
  ) {}

  @Process('process-cv')
  async handleProcessCV(job: Job<CVProcessingJobData>) {
    const { cvMatchResultId, cvText, jobName, jobDescription, jobSkills, jobLevel } = job.data;
    
    this.logger.log(`Processing CV match: ${cvMatchResultId}`);

    try {
      // Update status to PROCESSING
      await this.cvMatchResultModel.findByIdAndUpdate(cvMatchResultId, {
        status: CVProcessingStatus.PROCESSING,
      });

      // 1. Create JD text and embedding
      const jdText = this.aiMatchingService.createJDText({
        name: jobName,
        description: jobDescription,
        skills: jobSkills,
        level: jobLevel,
      });

      const jdEmbedding = await this.aiMatchingService.generateEmbedding(jdText);

      // 2. Match CV with JD using pre-parsed text (no file download needed)
      const matchResult = await this.aiMatchingService.matchCVWithJD(
        cvText,
        jdText,
        jdEmbedding,
        jobSkills,
      );

      // 3. Generate CV embedding for future use
      const cvEmbedding = matchResult.cvText 
        ? await this.aiMatchingService.generateEmbedding(matchResult.cvText)
        : [];

      // 4. Update result in database
      await this.cvMatchResultModel.findByIdAndUpdate(cvMatchResultId, {
        cvText: matchResult.cvText,
        cvEmbedding,
        matchScore: matchResult.matchScore,
        matchedSkills: matchResult.matchedSkills,
        missingSkills: matchResult.missingSkills,
        explanation: matchResult.explanation,
        status: CVProcessingStatus.COMPLETED,
        processedAt: new Date(),
      });

      this.logger.log(`CV match completed: ${cvMatchResultId}, score: ${matchResult.matchScore}`);
      
      return { success: true, matchScore: matchResult.matchScore };
    } catch (error) {
      this.logger.error(`CV processing failed: ${cvMatchResultId}`, error);

      await this.cvMatchResultModel.findByIdAndUpdate(cvMatchResultId, {
        status: CVProcessingStatus.FAILED,
        errorMessage: error.message || 'Unknown error',
      });

      throw error;
    }
  }

  @Process('reprocess-cv')
  async handleReprocessCV(job: Job<{ cvMatchResultId: string }>) {
    const result = await this.cvMatchResultModel.findById(job.data.cvMatchResultId).populate([
      { path: 'jobId', select: 'name description skills level' },
      { path: 'cvId', select: 'parsedText skills' },
    ]).lean() as any;

    if (!result || !result.jobId) {
      this.logger.warn(`CV match result not found: ${job.data.cvMatchResultId}`);
      return;
    }

    // Use pre-parsed text from UserCV or fallback to existing cvText
    const cvText = result.cvId?.parsedText || result.cvText || '';

    const jobData: CVProcessingJobData = {
      cvMatchResultId: job.data.cvMatchResultId,
      cvText,
      jobId: result.jobId._id.toString(),
      jobName: result.jobId.name,
      jobDescription: result.jobId.description || '',
      jobSkills: Array.isArray(result.jobId.skills) 
        ? result.jobId.skills.map((s: any) => typeof s === 'string' ? s : s.name)
        : [],
      jobLevel: result.jobId.level || '',
    };

    return this.handleProcessCV({ ...job, data: jobData } as Job<CVProcessingJobData>);
  }
}
