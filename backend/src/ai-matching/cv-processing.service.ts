import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { Model } from 'mongoose';
import mongoose from 'mongoose';
import { CVMatchResult, CVMatchResultDocument, CVProcessingStatus } from './schemas/cv-match-result.schema';
import { CVProcessingJobData } from './cv-processing.processor';

@Injectable()
export class CVProcessingService {
  private readonly logger = new Logger(CVProcessingService.name);

  constructor(
    @InjectModel(CVMatchResult.name)
    private readonly cvMatchResultModel: Model<CVMatchResultDocument>,
    @InjectQueue('cv-processing')
    private readonly cvProcessingQueue: Queue,
  ) {}

  /**
   * Queue CV processing when an application is created
   * Uses pre-parsed CV text from DB (no file download needed)
   */
  async queueCVProcessing(params: {
    cvId: string;
    userId: string;
    applicationId: string;
    cvUrl: string;
    cvText: string; // Pre-parsed text from UserCV
    job: {
      _id: string;
      name: string;
      description?: string;
      skills?: string[];
      level?: string;
    };
  }): Promise<CVMatchResult> {
    const { cvId, userId, applicationId, cvUrl, cvText, job } = params;

    // Check if already exists
    const existing = await this.cvMatchResultModel.findOne({
      cvId: new mongoose.Types.ObjectId(cvId),
      jobId: new mongoose.Types.ObjectId(job._id),
    });

    if (existing) {
      this.logger.log(`CV match result already exists for CV ${cvId} and Job ${job._id}`);
      
      // If failed or pending, requeue
      if (existing.status === CVProcessingStatus.FAILED || existing.status === CVProcessingStatus.PENDING) {
        await this.cvProcessingQueue.add('reprocess-cv', {
          cvMatchResultId: existing._id.toString(),
        }, {
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
        });
      }
      
      return existing;
    }

    // Create new match result record
    const cvMatchResult = await this.cvMatchResultModel.create({
      cvId: new mongoose.Types.ObjectId(cvId),
      userId: new mongoose.Types.ObjectId(userId),
      jobId: new mongoose.Types.ObjectId(job._id),
      applicationId: new mongoose.Types.ObjectId(applicationId),
      cvUrl,
      status: CVProcessingStatus.PENDING,
    });

    // Get job skills as array of strings
    const jobSkills = Array.isArray(job.skills)
      ? job.skills.map((s: any) => typeof s === 'string' ? s : s.name)
      : [];

    // Add to queue
    const jobData: CVProcessingJobData = {
      cvMatchResultId: cvMatchResult._id.toString(),
      cvText, // Use pre-parsed text from DB
      jobId: job._id,
      jobName: job.name,
      jobDescription: job.description || '',
      jobSkills,
      jobLevel: job.level || '',
    };

    await this.cvProcessingQueue.add('process-cv', jobData, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: true,
      removeOnFail: false,
    });

    this.logger.log(`Queued CV processing: CV ${cvId} for Job ${job._id}`);

    return cvMatchResult;
  }

  /**
   * Get pre-calculated ranked candidates for a job
   * Fast query from database instead of real-time processing
   */
  async getRankedCandidates(
    jobId: string,
    topN: number = 10,
  ): Promise<CVMatchResultDocument[]> {
    const results = await this.cvMatchResultModel
      .find({
        jobId: new mongoose.Types.ObjectId(jobId),
        status: CVProcessingStatus.COMPLETED,
        isDeleted: false,
      })
      .sort({ matchScore: -1 })
      .limit(topN)
      .populate([
        { path: 'userId', select: 'name email avatar _id' },
        { path: 'cvId', select: 'url title _id' },
        { path: 'applicationId', select: 'status createdAt _id' },
      ])
      .lean();

    return results;
  }

  /**
   * Get processing status for a job
   */
  async getProcessingStatus(jobId: string): Promise<{
    total: number;
    completed: number;
    processing: number;
    pending: number;
    failed: number;
  }> {
    const stats = await this.cvMatchResultModel.aggregate([
      { $match: { jobId: new mongoose.Types.ObjectId(jobId), isDeleted: false } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    const result = {
      total: 0,
      completed: 0,
      processing: 0,
      pending: 0,
      failed: 0,
    };

    for (const stat of stats) {
      result.total += stat.count;
      switch (stat._id) {
        case CVProcessingStatus.COMPLETED:
          result.completed = stat.count;
          break;
        case CVProcessingStatus.PROCESSING:
          result.processing = stat.count;
          break;
        case CVProcessingStatus.PENDING:
          result.pending = stat.count;
          break;
        case CVProcessingStatus.FAILED:
          result.failed = stat.count;
          break;
      }
    }

    return result;
  }

  /**
   * Reprocess failed CVs for a job
   */
  async reprocessFailedCVs(jobId: string): Promise<number> {
    const failedResults = await this.cvMatchResultModel.find({
      jobId: new mongoose.Types.ObjectId(jobId),
      status: CVProcessingStatus.FAILED,
      isDeleted: false,
    });

    for (const result of failedResults) {
      await this.cvProcessingQueue.add('reprocess-cv', {
        cvMatchResultId: result._id.toString(),
      }, {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
      });
    }

    this.logger.log(`Requeued ${failedResults.length} failed CV processing jobs for Job ${jobId}`);

    return failedResults.length;
  }

  /**
   * Delete match results when application is deleted
   */
  async deleteByApplication(applicationId: string): Promise<void> {
    await this.cvMatchResultModel.updateMany(
      { applicationId: new mongoose.Types.ObjectId(applicationId) },
      { isDeleted: true },
    );
  }

  /**
   * Re-process all CVs for a job when job details are updated
   * This is needed when HR updates job requirements, skills, description, etc.
   */
  async reprocessAllCVsForJob(jobId: string, jobData: {
    name: string;
    description?: string;
    skills?: string[];
    level?: string;
  }): Promise<number> {
    const allResults = await this.cvMatchResultModel.find({
      jobId: new mongoose.Types.ObjectId(jobId),
      isDeleted: false,
    });

    if (allResults.length === 0) {
      this.logger.log(`No CV match results found for Job ${jobId}`);
      return 0;
    }

    // Get job skills as array of strings
    const jobSkills = Array.isArray(jobData.skills)
      ? jobData.skills.map((s: any) => typeof s === 'string' ? s : s.name)
      : [];

    // Reset status and requeue all
    for (const result of allResults) {
      await this.cvMatchResultModel.findByIdAndUpdate(result._id, {
        status: CVProcessingStatus.PENDING,
        matchScore: null,
        matchedSkills: [],
        missingSkills: [],
        explanation: null,
      });

      const jobProcessingData: CVProcessingJobData = {
        cvMatchResultId: result._id.toString(),
        cvText: result.cvText || '', // Use existing parsed text
        jobId: jobId,
        jobName: jobData.name,
        jobDescription: jobData.description || '',
        jobSkills,
        jobLevel: jobData.level || '',
      };

      await this.cvProcessingQueue.add('process-cv', jobProcessingData, {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: true,
        removeOnFail: false,
      });
    }

    this.logger.log(`Requeued ${allResults.length} CV processing jobs for updated Job ${jobId}`);

    return allResults.length;
  }

  /**
   * Re-process CV when user updates their CV
   * This reprocesses the CV against all jobs they have applied to
   */
  async reprocessCVForAllJobs(cvId: string, cvUrl: string): Promise<number> {
    const allResults = await this.cvMatchResultModel.find({
      cvId: new mongoose.Types.ObjectId(cvId),
      isDeleted: false,
    }).populate([{ path: 'jobId', select: 'name description skills level' }]);

    if (allResults.length === 0) {
      this.logger.log(`No job applications found for CV ${cvId}`);
      return 0;
    }

    for (const result of allResults) {
      const job = result.jobId as any;
      if (!job) continue;

      await this.cvMatchResultModel.findByIdAndUpdate(result._id, {
        status: CVProcessingStatus.PENDING,
        cvUrl, // Update to new CV URL
        matchScore: null,
        matchedSkills: [],
        missingSkills: [],
        explanation: null,
      });

      const jobSkills = Array.isArray(job.skills)
        ? job.skills.map((s: any) => typeof s === 'string' ? s : s.name)
        : [];

      const jobProcessingData: CVProcessingJobData = {
        cvMatchResultId: result._id.toString(),
        cvText: result.cvText || '', // Use existing parsed text
        jobId: job._id.toString(),
        jobName: job.name,
        jobDescription: job.description || '',
        jobSkills,
        jobLevel: job.level || '',
      };

      await this.cvProcessingQueue.add('process-cv', jobProcessingData, {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: true,
        removeOnFail: false,
      });
    }

    this.logger.log(`Requeued ${allResults.length} CV processing jobs for updated CV ${cvId}`);

    return allResults.length;
  }
}
