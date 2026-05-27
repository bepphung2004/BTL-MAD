import {
  BadRequestException,
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Application, ApplicationDocument, ApplicationStatus } from './schemas/application.schema';
import { SoftDeleteModel } from 'soft-delete-plugin-mongoose';
import { IUser } from 'src/users/users.interface';
import { CreateApplicationDto } from './dto/create-application.dto';
import { UpdateApplicationStatusDto } from './dto/update-application.dto';
import mongoose from 'mongoose';
import { UsersService } from 'src/users/users.service';
import { UserCVsService } from 'src/usercvs/usercvs.service';
import { Role } from 'src/decorator/customize';
import aqp from 'api-query-params';
import { NotificationsService } from 'src/notifications/notifications.service';
import { NotificationTargetType, NotificationType } from 'src/notifications/schemas/notification.schema';
import { AIMatchingService } from 'src/ai-matching/ai-matching.service';
import { CVProcessingService } from 'src/ai-matching/cv-processing.service';
import { JobsService } from 'src/jobs/jobs.service';
import {
  ICandidateMatchResult,
  IAIRankingResponse,
} from 'src/ai-matching/dto/ai-match-result.dto';
import { CreateNotificationDto } from 'src/notifications/dto/create-notification.dto';
import { CVMatchResult, CVMatchResultDocument } from 'src/ai-matching/schemas/cv-match-result.schema';

@Injectable()
export class ApplicationsService {
  constructor(
    @InjectModel(Application.name)
    private readonly applicationModel: SoftDeleteModel<ApplicationDocument>,

    @InjectModel(CVMatchResult.name)
    private readonly cvMatchResultModel: SoftDeleteModel<CVMatchResultDocument>,
    private readonly usersService: UsersService,
    private readonly userCVsService: UserCVsService,
    private readonly notificationsService: NotificationsService,
    private readonly aiMatchingService: AIMatchingService,
    private readonly cvProcessingService: CVProcessingService,
    @Inject(forwardRef(() => JobsService))
    private readonly jobsService: JobsService,
  ) {}

  // User applies for a job with selected CV
  async create(createApplicationDto: CreateApplicationDto, user: IUser) {
    const { cvId, jobId, companyId, coverLetter } = createApplicationDto;

    // Check if CV exists and belongs to user
    const cv = await this.userCVsService.findOne(cvId, user);
    if (!cv) {
      throw new BadRequestException('CV không tồn tại hoặc không thuộc về bạn');
    }

    // Cho phép nộp lại nhiều lần (đã bỏ check duplicate)
    // User có thể rút đơn và nộp lại với CV khác

    // Get job details for AI processing
    const job = await this.jobsService.findOne(jobId);
    if (!job) {
      throw new BadRequestException('Công việc không tồn tại');
    }

    const application = await this.applicationModel.create({
      cvId,
      userId: user._id,
      jobId,
      companyId,
      coverLetter,
      status: ApplicationStatus.PENDING,
      history: [
        {
          status: ApplicationStatus.PENDING,
          updatedAt: new Date(),
          updatedBy: {
            _id: user._id,
            email: user.email,
          },
        },
      ],
      createdBy: {
        _id: user._id,
        email: user.email,
      },
    });

    // Queue CV processing for AI matching (async - returns immediately)
    // Use pre-parsed text from UserCV - no need to re-download/parse file
    try {
      const jobSkills = Array.isArray(job.skills)
        ? job.skills.map((s: any) => typeof s === 'string' ? s : s.name)
        : [];

      // Build CV text from DB data:
      // For uploaded CVs: use parsedText stored during upload
      // For online CVs: build text from structured data
      let cvText = '';
      const cvDoc = cv as any;
      
      if (cvDoc.parsedText) {
        // Uploaded CV - use pre-parsed text
        cvText = cvDoc.parsedText;
      } else if (cvDoc.onlineCvId) {
        // Online CV - build text from structured fields
        const parts = [
          cvDoc.skills?.length ? `Skills: ${cvDoc.skills.join(', ')}` : '',
          cvDoc.education?.length ? `Education: ${cvDoc.education.join('. ')}` : '',
          cvDoc.experience?.length ? `Experience: ${cvDoc.experience.join('. ')}` : '',
          cvDoc.certificates?.length ? `Certificates: ${cvDoc.certificates.join(', ')}` : '',
          cvDoc.description || '',
        ];
        cvText = parts.filter(Boolean).join('\n');
      }

      if (cvText && cvText.length > 10) {
        await this.cvProcessingService.queueCVProcessing({
          cvId: cv._id.toString(),
          userId: user._id,
          applicationId: application._id.toString(),
          cvUrl: cv.url,
          cvText,
          job: {
            _id: job._id.toString(),
            name: job.name,
            description: job.description,
            skills: jobSkills,
            level: job.level,
          },
        });
        console.log('CV processing queued for application:', application._id);
      } else {
        console.log('CV has no parsed text, skipping AI matching for:', application._id);
      }
    } catch (error) {
      console.error('Failed to queue CV processing:', error);
      // Don't fail the application creation if queuing fails
    }

    const applicationInDb = await this.applicationModel.findById(application._id)
      .populate([
        { path: 'jobId', select: 'name _id' },
        { path: 'companyId', select: 'name _id' },
        { path: 'userId', select: 'name _id' },
      ]) as any;
    
    console.log("Application created:", applicationInDb);
    const hrs = await this.usersService.findAllByCompanyId(applicationInDb.companyId._id.toString());

    console.log("HRs found for company:", hrs?.length);
    if (hrs && hrs.length > 0) {
      for (const hr of hrs) {
        const notiObj: CreateNotificationDto = {
          userId: hr._id.toString(),
          title: 'Đơn ứng tuyển mới',
          content: `Bạn có một đơn ứng tuyển mới cho công việc ${applicationInDb.jobId.name} từ ứng viên ${applicationInDb.userId.name}.`,
          type: NotificationType.RESUME,
          targetType: NotificationTargetType.APPLICATION,
          targetId: application._id.toString(),
          data: { 
            applicationId: application._id.toString(),
            jobId: applicationInDb.jobId._id.toString(),
          },
        };

        this.notificationsService.create(notiObj);
      }
    }


    return {
      _id: application._id,
      createdAt: application.createdAt,
    };
  }

  // Get all applications (Admin/HR)
  async findAll(qs: any, user: IUser) {
    const { filter, sort, population, projection } = aqp(qs);
    delete filter.current;
    delete filter.pageSize;

    const userInfo = await this.usersService.findOne(user._id);

    // HR can only see applications from their company
    if (userInfo.role === Role.HR && userInfo.company) {
      filter.companyId = userInfo.company._id;
    }

    const totalRecord = await this.applicationModel.countDocuments(filter);
    const limit = qs.pageSize ? parseInt(qs.pageSize) : 10;
    const totalPage = Math.ceil(totalRecord / limit);
    const skip = (parseInt(qs.current || '1') - 1) * limit;

    const applications = await this.applicationModel
      .find(filter)
      .skip(skip)
      .limit(limit)
      .select(projection)
      .sort(sort as any)
      .populate([
        { path: 'cvId', select: 'url title _id' },
        { path: 'userId', select: 'name email avatar _id' },
        { path: 'companyId', select: 'name logo _id' },
        { path: 'jobId', select: 'name salary level _id' },
      ]);

    return {
      meta: {
        current: parseInt(qs.current || '1'),
        pageSize: limit,
        pages: totalPage,
        total: totalRecord,
      },
      result: applications,
    };
  }

  // Get applications by job (for HR to review)
  async findByJob(jobId: string, qs: any, user: IUser) {
    if (!mongoose.Types.ObjectId.isValid(jobId)) {
      throw new BadRequestException('Công việc không tồn tại');
    }

    const limit = qs.pageSize ? parseInt(qs.pageSize) : 10;
    const skip = (parseInt(qs.current || '1') - 1) * limit;

    const filter: any = { jobId, isDeleted: false };

    if (qs.status) {
      filter.status = qs.status;
    }

    const totalRecord = await this.applicationModel.countDocuments(filter);
    const totalPage = Math.ceil(totalRecord / limit);

    const applications = await this.applicationModel
      .find(filter)
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 })
      .populate([
        { path: 'cvId', select: 'url title _id' },
        { path: 'userId', select: 'name email address gender _id' },
      ]);

    return {
      meta: {
        current: parseInt(qs.current || '1'),
        pageSize: limit,
        pages: totalPage,
        total: totalRecord,
      },
      result: applications,
    };
  }

  // Get user's own applications
  async findByUser(user: IUser) {
    const applications = await this.applicationModel
      .find({ userId: user._id, isDeleted: false })
      .sort({ createdAt: -1 })
      .populate([
        { path: 'cvId', select: 'url title _id' },
        { path: 'companyId', select: 'name logo _id' },
        { path: 'jobId', select: 'name salary level location _id' },
      ]);

    return applications;
  }

  // Get one application
  async findOne(id: string) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Đơn ứng tuyển không tồn tại');
    }

    const application = await this.applicationModel
      .findOne({ _id: id, isDeleted: false })
      .populate([
        { path: 'cvId', select: 'url title _id' },
        { path: 'userId', select: 'name email avatar phone _id' },
        { path: 'companyId', select: 'name logo _id' },
        { path: 'jobId', select: 'name salary level location _id' },
      ]);

    if (!application) {
      throw new NotFoundException('Đơn ứng tuyển không tồn tại');
    }

    return application;
  }

  // Update application status (HR/Admin)
  async updateStatus(
    id: string,
    updateDto: UpdateApplicationStatusDto,
    user: IUser,
  ) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Đơn ứng tuyển không tồn tại');
    }

    const application = await this.applicationModel.findOne({
      _id: id,
      isDeleted: false,
    }).populate("jobId companyId") as any;

    if (!application) {
      throw new NotFoundException('Đơn ứng tuyển không tồn tại');
    }

    const newHistory = {
      status: updateDto.status,
      updatedAt: new Date(),
      updatedBy: {
        _id: user._id,
        email: user.email,
      },
    };

    //send notification to user about status update with navigation target
    const notiObj: CreateNotificationDto = {
      userId: application.userId.toString(),
      title: '',
      content: '',
      type: NotificationType.RESUME,
      targetType: NotificationTargetType.APPLICATION,
      targetId: application._id.toString(),
      data: { 
        applicationId: application._id.toString(),
        jobId: application.jobId._id.toString(),
        companyId: application.companyId._id.toString(),
      },
    };

    switch (updateDto.status) {
      case ApplicationStatus.REVIEWING:
        notiObj.title = 'Đơn ứng tuyển của bạn đang được xem xét';
        notiObj.content = `Đơn ứng tuyển của bạn cho công việc ${application.jobId.name} tại công ty ${application.companyId.name} đã được chuyển sang trạng thái Đang xem xét.`;
        await this.notificationsService.create(notiObj);
        break;
      case ApplicationStatus.APPROVED:
        notiObj.title = 'Đơn ứng tuyển của bạn đã được chấp thuận';
        notiObj.content = `Chúc mừng! Đơn ứng tuyển của bạn cho công việc ${application.jobId.name} tại công ty ${application.companyId.name} đã được chấp thuận.`;
        await this.notificationsService.create(notiObj);
        break;
      case ApplicationStatus.REJECTED:
        notiObj.title = 'Đơn ứng tuyển của bạn đã bị từ chối';
        notiObj.content = `Rất tiếc! Đơn ứng tuyển của bạn cho công việc ${application.jobId.name} tại công ty ${application.companyId.name} đã bị từ chối.`;
        await this.notificationsService.create(notiObj);
        break;
    }

    return await this.applicationModel.findByIdAndUpdate(
      id,
      {
        status: updateDto.status,
        $push: { history: newHistory },
        updatedBy: {
          _id: user._id,
          email: user.email,
        },
      },
      { new: true },
    );
  }

  // Delete application (user can withdraw their application)
  async remove(id: string, user: IUser) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Đơn ứng tuyển không tồn tại');
    }

    const application = await this.applicationModel.findOne({
      _id: id,
      userId: user._id,
      isDeleted: false,
    });

    if (!application) {
      throw new BadRequestException(
        'Đơn ứng tuyển không tồn tại hoặc không thuộc về bạn',
      );
    }



    await this.applicationModel.updateOne(
      { _id: id },
      {
        deletedBy: {
          _id: user._id,
          email: user.email,
        },
      },
    );

    await this.cvMatchResultModel.deleteOne({ applicationId: id });

    return await this.applicationModel.softDelete({ _id: id });
  }

  // Count applications by status for a company
  async countByCompany(companyId: string) {
    const stats = await this.applicationModel.aggregate([
      {
        $match: {
          companyId: new mongoose.Types.ObjectId(companyId),
          isDeleted: false,
        },
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    return stats;
  }

  // Count applications by job
  async countByJob(jobId: string) {
    return await this.applicationModel.countDocuments({
      jobId,
      isDeleted: false,
    });
  }

  /**
   * AI-powered ranking of candidates for a specific job
   * Now retrieves pre-calculated results from database (fast query)
   * CV processing is done asynchronously when applications are created
   */
  async getAIRankedCandidates(
    jobId: string,
    topN: number = 10,
    user: IUser,
  ): Promise<IAIRankingResponse> {
    // 1. Validate job exists
    if (!mongoose.Types.ObjectId.isValid(jobId)) {
      throw new BadRequestException('Job ID không hợp lệ');
    }

    const job = await this.jobsService.findOne(jobId);
    if (!job) {
      throw new NotFoundException('Công việc không tồn tại');
    }

    // 2. Get total applications count
    const totalApplications = await this.applicationModel.countDocuments({
      jobId,
      isDeleted: false,
    });

    if (totalApplications === 0) {
      return {
        jobId,
        jobName: job.name,
        totalApplications: 0,
        rankedCandidates: [],
        processedAt: new Date().toISOString(),
      };
    }

    // 3. Get pre-calculated ranked candidates from database (fast query)
    const rankedResults = await this.cvProcessingService.getRankedCandidates(jobId, topN);

    // 4. Transform to response format
    const candidateResults: ICandidateMatchResult[] = rankedResults.map((result: any) => {
      const userInfo = result.userId;
      const cvInfo = result.cvId;
      const appInfo = result.applicationId;

      return {
        applicationId: appInfo?._id?.toString() || result.applicationId?.toString() || '',
        candidateId: userInfo?._id?.toString() || '',
        candidateName: userInfo?.name || 'Ẩn danh',
        candidateEmail: userInfo?.email || '',
        candidateAvatar: userInfo?.avatar,
        cvId: cvInfo?._id?.toString() || '',
        cvTitle: cvInfo?.title || 'CV',
        cvUrl: result.cvUrl || cvInfo?.url || '',
        matchScore: result.matchScore,
        matchedSkills: result.matchedSkills || [],
        missingSkills: result.missingSkills || [],
        shortExplanation: result.explanation || '',
        applicationStatus: appInfo?.status || 'PENDING',
        appliedAt: appInfo?.createdAt?.toISOString() || new Date().toISOString(),
      };
    });

    // 5. Get processing status for additional info
    const processingStatus = await this.cvProcessingService.getProcessingStatus(jobId);

    return {
      jobId,
      jobName: job.name,
      totalApplications,
      rankedCandidates: candidateResults,
      processedAt: new Date().toISOString(),
      processingStatus, // Additional field for UI to show processing progress
    } as IAIRankingResponse;
  }

  /**
   * Search applications by CV content (skills, education, address, certificates)
   * Searches both structured UserCV fields and parsedText
   */
  async searchByCV(
    jobId: string,
    query: { skills?: string; education?: string; address?: string; certificates?: string },
    user: IUser,
  ) {
    if (!mongoose.Types.ObjectId.isValid(jobId)) {
      throw new BadRequestException('Job ID không hợp lệ');
    }

    const skillKeywords = query.skills
      ? query.skills.split(',').map(s => s.trim()).filter(Boolean)
      : [];
    const educationKeyword = query.education?.trim() || '';
    const addressKeyword = query.address?.trim() || '';
    const certificatesKeywords = query.certificates
      ? query.certificates.split(',').map(s => s.trim()).filter(Boolean)
      : [];

    if (skillKeywords.length === 0 && !educationKeyword && !addressKeyword && certificatesKeywords.length === 0) {
      throw new BadRequestException('Vui lòng nhập ít nhất một tiêu chí tìm kiếm');
    }

    // Build $and conditions: each criterion is an $or group (structured OR parsedText)
    // ALL criteria must match (AND logic between different filter types)
    const andConditions: any[] = [];

    if (skillKeywords.length > 0) {
      const skillRegexes = skillKeywords.map(
        s => new RegExp(s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'),
      );
      const skillsPattern = skillKeywords
        .map(s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
        .join('|');

      andConditions.push({
        $or: [
          { 'cv.skills': { $in: skillRegexes } },
          { 'cv.parsedText': { $regex: skillsPattern, $options: 'i' } },
        ],
      });
    }

    if (educationKeyword) {
      const escapedEdu = educationKeyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      andConditions.push({
        $or: [
          { 'cv.education': { $elemMatch: { $regex: escapedEdu, $options: 'i' } } },
          { 'cv.parsedText': { $regex: escapedEdu, $options: 'i' } },
        ],
      });
    }

    if (addressKeyword) {
      const escapedAddr = addressKeyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      andConditions.push({
        $or: [
          { 'user.address': { $regex: escapedAddr, $options: 'i' } },
          { 'cv.parsedText': { $regex: escapedAddr, $options: 'i' } },
        ],
      });
    }

    if (certificatesKeywords.length > 0) {
      const certRegexes = certificatesKeywords.map(
        s => new RegExp(s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'),
      );
      const certsPattern = certificatesKeywords
        .map(s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
        .join('|');

      andConditions.push({
        $or: [
          { 'cv.certificates': { $in: certRegexes } },
          { 'cv.parsedText': { $regex: certsPattern, $options: 'i' } },
        ],
      });
    }

    // Build the filter match stage
    const contentFilter = andConditions.length === 1
      ? andConditions[0]
      : { $and: andConditions };

    const pipeline: any[] = [
      // 1. Match applications for this job
      {
        $match: {
          jobId: new mongoose.Types.ObjectId(jobId),
          isDeleted: false,
        },
      },
      // 2. Lookup UserCV
      {
        $lookup: {
          from: 'usercvs',
          localField: 'cvId',
          foreignField: '_id',
          as: 'cv',
        },
      },
      { $unwind: '$cv' },
      // 3. Lookup User info (needed for address filtering)
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'user',
        },
      },
      { $unwind: '$user' },
      // 4. Filter by criteria
      { $match: contentFilter },
      // 5. Project needed fields
      {
        $project: {
          _id: 1,
          status: 1,
          coverLetter: 1,
          createdAt: 1,
          cvId: {
            _id: '$cv._id',
            url: '$cv.url',
            title: '$cv.title',
            skills: '$cv.skills',
            education: '$cv.education',
            certificates: '$cv.certificates',
            fileType: '$cv.fileType',
          },
          userId: {
            _id: '$user._id',
            name: '$user.name',
            email: '$user.email',
            avatar: '$user.avatar',
            address: '$user.address',
          },
        },
      },
      // 6. Sort by createdAt desc
      { $sort: { createdAt: -1 as const } },
    ];

    const results = await this.applicationModel.aggregate(pipeline);

    // Enrich results with match details
    const enrichedResults = results.map(app => {
      const matchedSkills: string[] = [];
      const matchedEducation: string[] = [];
      const matchedCertificates: string[] = [];
      let matchedAddress = false;
      let matchedInParsedText = false;

      if (skillKeywords.length > 0 && app.cvId?.skills?.length) {
        for (const skill of app.cvId.skills) {
          if (
            skillKeywords.some(kw =>
              skill.toLowerCase().includes(kw.toLowerCase()),
            )
          ) {
            matchedSkills.push(skill);
          }
        }
      }

      if (educationKeyword && app.cvId?.education?.length) {
        for (const edu of app.cvId.education) {
          if (edu.toLowerCase().includes(educationKeyword.toLowerCase())) {
            matchedEducation.push(edu);
          }
        }
      }

      if (addressKeyword && app.userId?.address) {
        if (app.userId.address.toLowerCase().includes(addressKeyword.toLowerCase())) {
          matchedAddress = true;
        }
      }

      if (certificatesKeywords.length > 0 && app.cvId?.certificates?.length) {
        for (const cert of app.cvId.certificates) {
          if (
            certificatesKeywords.some(kw =>
              cert.toLowerCase().includes(kw.toLowerCase()),
            )
          ) {
            matchedCertificates.push(cert);
          }
        }
      }

      // Check if match came from parsedText (no structured match found)
      if (matchedSkills.length === 0 && matchedEducation.length === 0 && !matchedAddress && matchedCertificates.length === 0) {
        matchedInParsedText = true;
      }

      return {
        ...app,
        matchInfo: {
          matchedSkills,
          matchedEducation,
          matchedAddress,
          matchedCertificates,
          matchedInParsedText,
        },
      };
    });

    return {
      total: enrichedResults.length,
      result: enrichedResults,
    };
  }
}
