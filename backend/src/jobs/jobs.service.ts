import {
  BadRequestException,
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateJobDto } from './dto/create-job.dto';
import { UpdateJobDto } from './dto/update-job.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Job, JobDocument } from './schemas/job.schema';
import { SoftDeleteModel } from 'soft-delete-plugin-mongoose';
import aqp from 'api-query-params';
import { IUser } from 'src/users/users.interface';
import mongoose, { Mongoose } from 'mongoose';
import { UsersService } from 'src/users/users.service';
import { RedisService } from 'src/redis/redis.service';
import { CompaniesService } from 'src/companies/companies.service';
import { Company, CompanyDocument } from 'src/companies/schemas/company.schema';
import { Application, ApplicationDocument } from 'src/applications/schemas/application.schema';
import { NotificationsService } from 'src/notifications/notifications.service';
import { NotificationTargetType, NotificationType } from 'src/notifications/schemas/notification.schema';
import { CVProcessingService } from 'src/ai-matching/cv-processing.service';

@Injectable()
export class JobsService {
  constructor(
    @InjectModel(Job.name)
    private readonly jobModel: SoftDeleteModel<JobDocument>,

    private readonly redisService: RedisService,

    @InjectModel(Company.name)
    private readonly companyModel: SoftDeleteModel<CompanyDocument>,

    @InjectModel(Application.name)
    private readonly applicationModel: SoftDeleteModel<ApplicationDocument>,
    @Inject(forwardRef(() => UsersService))
    private readonly usersService: UsersService,

    private readonly notificationsService: NotificationsService,
    
    private readonly cvProcessingService: CVProcessingService,
  ) {}

  async getAll() {
    return await this.jobModel.find().lean().exec();
  }

  async getJobsByHr(user: IUser, qs: any) {

    
    const userInDb = await this.usersService.findOneByEmail(user.email);

    if (!userInDb.company) {
      throw new BadRequestException('HR does not belong to any company');
    }

    const companyInDb = await this.companyModel.findOne({
      _id: userInDb.company._id,
    });

    if(!companyInDb) {
      throw new BadRequestException('Company not found');
    }

    if(!companyInDb.isActive) {
      throw new BadRequestException('Company is not active');
    }

    const { filter, sort, population } = aqp(qs);
    delete filter.current;
    delete filter.pageSize;

    filter['company._id'] = new mongoose.Types.ObjectId(companyInDb._id);

    filter['endDate'] = { $gt: new Date() };

    const totalRecord = (await this.jobModel.find(filter)).length;
    const limit = qs.pageSize ? parseInt(qs.pageSize) : 10;
    const totalPage = Math.ceil(totalRecord / limit);
    const skip = (qs.current - 1) * limit;
    const current = +qs.current ? +qs.current : 1;

    const jobs = await this.jobModel
      .find(filter)
      .skip(skip)
      .limit(limit)
      .sort(sort as any)
      .populate({
        path: 'skills',
        select: 'name',
      })

    const jobsWithApplicationsCount = await Promise.all(
      jobs.map(async (job) => {
        
        const applications = await this.applicationModel.countDocuments({ 'jobId': job._id });
        return {
          ...job.toObject(),
          applicationsCount: applications,
        };
      }),
    );

    return {
      meta: {
        current: current, 
        pageSize: limit,
        pages: totalPage,
        total: totalRecord,
      },
      result: jobsWithApplicationsCount,
    };

    

  }

  async searchJobsByHr(user: IUser, name: string, qs: any) {
    const userInDb = await this.usersService.findOneByEmail(user.email);

    if (!userInDb.company) {
      throw new BadRequestException('HR does not belong to any company');
    }

    const companyInDb = await this.companyModel.findOne({
      _id: userInDb.company._id,
    });

    if(!companyInDb) {
      throw new BadRequestException('Company not found');
    }

    if(!companyInDb.isActive) {
      throw new BadRequestException('Company is not active');
    }

    const { filter, sort, population } = aqp(qs);
    delete filter.current;
    delete filter.pageSize;
    delete filter.name;

    filter['company._id'] = new mongoose.Types.ObjectId(companyInDb._id);

    // Add name search filter if provided
    if (name && name.trim()) {
      filter.name = { $regex: name.trim(), $options: 'i' };
    }

    const totalRecord = (await this.jobModel.find(filter)).length;
    const limit = qs.pageSize ? parseInt(qs.pageSize) : 10;
    const totalPage = Math.ceil(totalRecord / limit);
    const skip = (qs.current - 1) * limit;
    const current = +qs.current ? +qs.current : 1;

    const jobs = await this.jobModel
      .find(filter)
      .skip(skip)
      .limit(limit)
      .sort(sort as any)
      .populate({
        path: 'skills',
        select: 'name',
      });

    const jobsWithApplicationsCount = await Promise.all(
      jobs.map(async (job) => {
        const applications = await this.applicationModel.countDocuments({ 'jobId': job._id });
        return {
          ...job.toObject(),
          applicationsCount: applications,
        };
      }),
    );

    return {
      meta: {
        current: current, 
        pageSize: limit,
        pages: totalPage,
        total: totalRecord,
      },
      result: jobsWithApplicationsCount,
    };
  }

  async create(createJobDto: CreateJobDto, user: IUser) {
    const userInDb = await this.usersService.findOneByEmail(user.email);

    if (
      userInDb.company &&
      createJobDto.company._id.toString() !== userInDb.company._id.toString()
    ) {
      throw new BadRequestException(
        `Please create job of company ${userInDb.company.name}`,
      );
    }

    const company = await this.companyModel.findOne(
      {
        _id: createJobDto.company._id,
        
      }
    );

    if (!company) {
      throw new BadRequestException('Company not found');
    }

    if (!company.isActive) {
      throw new BadRequestException('Company is not active');
    }
    
    createJobDto.company = {
      _id: new mongoose.Types.ObjectId(company._id),
      name: company.name,
      logo: company.logo,
      isActive: company.isActive,
    };
    
    const newJob = await this.jobModel.create({
      ...createJobDto,
      createdBy: {
        _id: user._id,
        email: user.email,
      },
    });

    //send notification to all users following the company with navigation target
    await this.notificationsService.createBulk(
      company.usersFollow.map(id => id.toString()),
      'Công ty ' + company.name + ' vừa đăng tuyển công việc mới',
      `Công việc ${newJob.name} với mức lương ${newJob.salary} VND đã được đăng tuyển. Hãy nhanh tay ứng tuyển ngay!`,
      NotificationType.JOB,
      NotificationTargetType.JOB,
      newJob._id.toString(), // targetId
      { jobId: newJob._id.toString(), companyId: company._id.toString() },
    );

    await this.redisService.invalidateJobsCache();

    return newJob;
  }

  async findAll(qs: any) {
    try {

      // Handle salary filter before aqp parsing
      const salaryFilter: any = {};
      if (qs.salary && typeof qs.salary === 'object') {
        if (qs.salary.lt) salaryFilter.$lt = Number(qs.salary.lt);
        if (qs.salary.lte) salaryFilter.$lte = Number(qs.salary.lte);
        if (qs.salary.gt) salaryFilter.$gt = Number(qs.salary.gt);
        if (qs.salary.gte) salaryFilter.$gte = Number(qs.salary.gte);
        delete qs.salary; // Remove before aqp parsing
      }

      const { filter, sort, population } = aqp(qs);
      delete filter.current;
      delete filter.pageSize;
      
      delete filter.companyName;

      // Apply salary filter if exists
      if (Object.keys(salaryFilter).length > 0) {
        filter.salary = salaryFilter;
      }

      let currentUser = null;
      if (filter.email) {
        currentUser = await this.usersService.findOneByEmail(filter.email);
      }

      if (currentUser && currentUser.company) {
        filter['company._id'] = currentUser.company._id;
      } else {
        // Only show jobs from active companies for regular users
        filter['company.isActive'] = true;
      }

      if(filter.companyId) {
        filter['company._id'] = new mongoose.Types.ObjectId(filter.companyId);
        // When filtering by specific company, don't require isActive check (admin/HR use case)
        delete filter['company.isActive'];
      }
      delete filter.companyId;
      delete filter.email;

      const totalRecord = (await this.jobModel.find(filter)).length;
      const limit = qs.pageSize ? parseInt(qs.pageSize) : 10;
      const totalPage = Math.ceil(totalRecord / limit);
      const skip = (qs.current - 1) * limit;
      const current = +qs.current ? +qs.current : 1;

      const jobs = await this.jobModel
        .find(filter)
        .skip(skip)
        .limit(limit)
        .sort(sort as any);

      const response = {
        meta: {
          current: current,
          pageSize: limit,
          pages: totalPage,
          total: totalRecord,
        },
        result: jobs,
      };

      // await this.redisService.setValue(cacheKey, JSON.stringify(response), 60);

      return response;
    } catch (err) {
      throw new BadRequestException(err.message);
    }
  }

  async findJobsBySkillName(names: string[]) {
    const regexNames = names.map((name) => new RegExp(name, 'i'));
    return await this.jobModel
      .find({ skills: { $in: regexNames } })
      .lean()
      .exec();
  }

  async findOne(id: string) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Job not found');
    }

    const job = await this.jobModel.findOne({ _id: id, isDeleted: false });

    if (!job) {
      throw new BadRequestException('Job not found');
    }
    return job;
  }

  async update(id: string, updateJobDto: UpdateJobDto, user: IUser) {
    const userInDb = await this.usersService.findOneByEmail(user.email);

    if (
      userInDb.company &&
      updateJobDto.company &&
      updateJobDto.company._id.toString() !== userInDb.company._id.toString()
    ) {
      throw new BadRequestException(
        `Please update job of company ${userInDb.company.name}`,
      );
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Job not found');
    }

    const company = await this.companyModel.findOne(
      {
        _id: updateJobDto.company?._id,
      }
    );

    if (!company) {
      throw new BadRequestException('Company not found');
    }

    if (!company.isActive) {
      throw new BadRequestException('Company is not active');
    }

    updateJobDto.company = {
      _id: new mongoose.Types.ObjectId(company._id),
      name: company.name,
      logo: company.logo,
    }

    // Fetch current job to compare description before updating
    const currentJob = await this.jobModel.findById(id).lean();
    const descriptionChanged = currentJob && updateJobDto.description !== undefined
      && updateJobDto.description !== currentJob.description;

    await this.redisService.invalidateJobsCache();

    const result = await this.jobModel.updateOne(
      { _id: id },
      {
        ...updateJobDto,
        updatedBy: {
          _id: user._id,
          email: user.email,
        },
      },
    );

    // Re-process all CVs only when description has changed
    if (descriptionChanged) {
      const updatedJob = await this.jobModel.findById(id).populate('skills').lean();
      if (updatedJob) {
        const jobSkills = Array.isArray(updatedJob.skills)
          ? updatedJob.skills.map((s: any) => typeof s === 'string' ? s : s.name)
          : [];
        
        await this.cvProcessingService.reprocessAllCVsForJob(id, {
          name: updatedJob.name,
          description: updatedJob.description,
          skills: jobSkills,
          level: updatedJob.level,
        });
      }
    }

    return result;
  }

  async remove(id: string, user: IUser) {
    const userInDb = await this.usersService.findOneByEmail(user.email);

    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Job not found');
    }

    const job = await this.jobModel.findOne({ _id: id });
    if (!job) {
      throw new BadRequestException('Job not found');
    }

    if (
      userInDb.company &&
      job.company._id.toString() !== userInDb.company._id.toString()
    ) {
      throw new BadRequestException(
        `Please delete job of company ${job.company.name}`,
      );
    }

    await this.redisService.invalidateJobsCache();
    return await this.jobModel.softDelete({ _id: id });
  }

  async countJobs() {
    return await this.jobModel.countDocuments();
  }
}
