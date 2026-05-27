import {
  BadRequestException,
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { Company, CompanyDocument } from './schemas/company.schema';
import { SoftDeleteModel } from 'soft-delete-plugin-mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { IUser } from 'src/users/users.interface';
import aqp from 'api-query-params';
import mongoose, { Model } from 'mongoose';
import { Job, JobDocument } from 'src/jobs/schemas/job.schema';
import { FollowCompanyDto } from './dto/follow-company.dto';
import { RedisService } from 'src/redis/redis.service';
import { UsersService } from 'src/users/users.service';
import { Role } from 'src/decorator/customize';
import { NotificationsService } from 'src/notifications/notifications.service';
import { CreateNotificationDto } from 'src/notifications/dto/create-notification.dto';
import {
  NotificationTargetType,
  NotificationType,
} from 'src/notifications/schemas/notification.schema';

@Injectable()
export class CompaniesService {
  constructor(
    @InjectModel(Company.name)
    private companyModel: SoftDeleteModel<CompanyDocument>,

    private readonly redisService: RedisService,

    private readonly notificationService: NotificationsService,

    @Inject(forwardRef(() => UsersService))
    private readonly usersService: UsersService,
    @InjectModel(Job.name)
    private jobModel: Model<JobDocument>,
  ) {}

  async create(createCompanyDto: CreateCompanyDto, user: IUser) {
    const companyExist = await this.companyModel.findOne({
      name: createCompanyDto.name,
    });

    if (companyExist) throw new BadRequestException('Company already exist');

    const newCompany = await this.companyModel.create({
      ...createCompanyDto,
      isActive: true,
      createdBy: {
        _id: user._id,
        email: user.email,
      },
    });

    await this.redisService.invalidateCompaniesCache();

    return newCompany;
  }

  async getAll() {
    return await this.companyModel.find({ isActive: true }).lean().exec();
  }

  async getAllByAdmin(qs: any) {
    const { filter, sort, population } = aqp(qs);
    delete filter.current;
    delete filter.pageSize;

    const totalRecord = (await this.companyModel.find(filter)).length;
    const limit = qs.pageSize ? parseInt(qs.pageSize) : 10;
    const totalPage = Math.ceil(totalRecord / limit);
    const skip = (qs.current - 1) * limit;
    const current = +qs.current;

    const companies = await this.companyModel
      .find(filter)
      .skip(skip)
      .limit(limit)
      .sort(sort as any)
      .populate(population);

    return {
      meta: {
        current: current,
        pageSize: limit,
        pages: totalPage,
        total: totalRecord,
      },
      result: companies,
    };
  }

  async findAll(qs: any) {
    const { filter, sort, population } = aqp(qs);
    delete filter.current;
    delete filter.pageSize;
    delete filter.isActive;

    const cacheKey = 'companies-' + JSON.stringify(qs);
    const cacheData = await this.redisService.getValue<string>(cacheKey);

    // if (cacheData) {
    //   return JSON.parse(cacheData as string);
    // }

    // Extract userId for checking follow status
    const userId = filter.userId;
    delete filter.userId;

    const totalRecord = (
      await this.companyModel.find({ ...filter, isActive: true })
    ).length;
    const limit = qs.pageSize ? parseInt(qs.pageSize) : 10;
    const totalPage = Math.ceil(totalRecord / limit);
    const skip = (qs.current - 1) * limit;
    const current = +qs.current;

    const companies = await this.companyModel
      .find({ ...filter, isActive: true })
      .skip(skip)
      .limit(limit)
      .sort(sort as any)
      .populate(population);

    // Add isFollowed field for each company
    const companiesWithJobCount = await Promise.all(
      companies.map(async (company) => {
        const companyObj = company.toObject() as any;
        companyObj.isFollowed = userId
          ? company.usersFollow?.some(
              (followerId) => followerId.toString() === userId,
            )
          : false;

        // Fetch job count for the company from jobs collection
        const jobCount = await this.jobModel.countDocuments({
          'company._id': company._id,
        });
        companyObj.jobCount = jobCount;

        return companyObj;
      }),
    );

    const response = {
      meta: {
        current: current,
        pageSize: limit,
        pages: totalPage,
        total: totalRecord,
      },
      result: companiesWithJobCount,
    };

    await this.redisService.setValue(cacheKey, JSON.stringify(response), 60);

    return response;
  }

  async followCompany(company: FollowCompanyDto, user: IUser) {
    const { companyId } = company;

    const companyExist = await this.companyModel.findOne({ _id: companyId });
    if (!companyExist) throw new BadRequestException('Company not found');

    const userFollow = companyExist.usersFollow.some(
      (item) => item.toString() === user._id.toString(),
    );

    if (userFollow) {
      throw new BadRequestException('User already follow company');
    }

    await this.companyModel
      .findByIdAndUpdate(
        company.companyId,
        { $addToSet: { usersFollow: user._id.toString() } },
        { new: true },
      )
      .exec();

    //send notification to all hrs when user follow company
    const hrsInCompany = await this.usersService.findAllByCompanyId(companyId);
    if (hrsInCompany && hrsInCompany.length > 0) {
      for (const hr of hrsInCompany) {
        const notiObj = {
          userId: hr._id.toString(),
          title: 'Công ty của bạn có người theo dõi mới',
          content: `Người dùng ${user.name} đã theo dõi công ty của bạn.`,
          type: NotificationType.COMPANY,
          targetType: 'company',
          targetId: companyId,
          data: { companyId },
        };
        this.notificationService.create(notiObj as CreateNotificationDto);
      }
    }

    return user._id;
  }

  async verifyCompany(companyId: string) {
    const companyExist = await this.companyModel.findOne({ _id: companyId });
    if (!companyExist) throw new BadRequestException('Company not found');

    const isAlreadyActive = companyExist.isActive;
    const newActiveStatus = !isAlreadyActive;

    const updatedCompany = await this.companyModel.updateOne(
      { _id: companyId },
      { isActive: newActiveStatus },
    );

    // Update all jobs belonging to this company with new isActive status
    await this.jobModel.updateMany(
      { 'company._id': new mongoose.Types.ObjectId(companyId) },
      { 'company.isActive': newActiveStatus },
    );

    await this.redisService.invalidateCompaniesCache();

    // Notify all HRs in company
    const hrsInCompany = await this.usersService.findAllByCompanyId(companyId);

    if (hrsInCompany && hrsInCompany.length > 0) {
      for (const hr of hrsInCompany) {
        const notiObj = {
          userId: hr._id.toString(),
          title: isAlreadyActive
            ? 'Công ty của bạn đã bị khóa'
            : 'Công ty của bạn đã được duyệt',
          content: isAlreadyActive
            ? 'Công ty của bạn đã bị khóa bởi quản trị viên. Vui lòng liên hệ để biết thêm chi tiết.'
            : 'Công ty của bạn đã được duyệt bởi quản trị viên. Bây giờ bạn có thể đăng tuyển dụng',
          type: NotificationType.COMPANY,
          targetType: 'company',
          targetId: companyId,
          data: { companyId },
        };

        await this.notificationService.create(notiObj as CreateNotificationDto);
      }
    }
    return updatedCompany;
  }

  async createByHr(createCompanyDto: CreateCompanyDto, user: IUser) {
    const companyExist = await this.companyModel.findOne({
      name: createCompanyDto.name,
    });

    if (companyExist) throw new BadRequestException('Company already exist');

    const newCompany = await this.companyModel.create({
      ...createCompanyDto,
      createdBy: {
        _id: user._id,
        email: user.email,
      },
    });

    await this.redisService.invalidateCompaniesCache();

    return newCompany;
  }

  async unfollowCompany(company: FollowCompanyDto, user: IUser) {
    const { companyId } = company;

    const companyExist = await this.companyModel.findOne({ _id: companyId });
    if (!companyExist) throw new BadRequestException('Company not found');

    const userFollow = companyExist.usersFollow.some(
      (item) => item.toString() === user._id.toString(),
    );

    if (!userFollow) throw new BadRequestException('User not follow company');

    await this.companyModel
      .findByIdAndUpdate(
        company.companyId,
        { $pull: { usersFollow: user._id.toString() } },
        { new: true },
      )
      .exec();

    return user._id;
  }

  async findOne(id: string) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Company not found');
    }

    const company = await this.companyModel.findOne({ _id: id });

    if (!company) throw new NotFoundException('Company not found');

    const hrsInCompany = await this.usersService.findAllByCompanyId(id);

    const companyObj = company.toObject() as any;
    companyObj.hrs = hrsInCompany;
    // Keep hr for backward compatibility (first HR)
    companyObj.hr =
      hrsInCompany && hrsInCompany.length > 0 ? hrsInCompany[0] : null;

    const jobCount = await this.jobModel.countDocuments({
      'company._id': company._id,
    });
    companyObj.jobCount = jobCount;

    return companyObj;
  }

  async getCompanyHrs(companyId: string) {
    const company = await this.companyModel.findOne({ _id: companyId });
    if (!company) throw new NotFoundException('Company not found');

    const hrs = await this.usersService.findAllByCompanyId(companyId);
    return hrs;
  }

  async findWithUserFollow(companyId: string) {
    return this.companyModel.findOne({ _id: companyId }).populate({
      path: 'usersFollow',
      select: {
        email: 1,
        name: 1,
      },
    });
  }

  async update(id: string, updateCompanyDto: UpdateCompanyDto, user: IUser) {
    const userInDb = await this.usersService.findOneByEmail(user.email);

    if (
      userInDb.role !== Role.ADMIN &&
      userInDb.company &&
      userInDb.company._id.toString() !== id
    ) {
      throw new BadRequestException(
        'You are not allowed to update this company',
      );
    }

    const updatedCompany = await this.companyModel.updateOne(
      { _id: id },
      {
        ...updateCompanyDto,
        updatedBy: {
          _id: user._id,
          email: user.email,
        },
      },
    );

    await this.redisService.invalidateCompaniesCache();
    return updatedCompany;
  }

  async remove(id: string, user: IUser) {
    const userInDb = await this.usersService.findOneByEmail(user.email);

    if (userInDb.role !== Role.ADMIN) {
      if (userInDb.company && userInDb.company._id.toString() !== id) {
        throw new BadRequestException(
          'You are not allowed to delete this company',
        );
      }
    }

    const company = await this.companyModel.findOne({ _id: id });
    if (!company) throw new BadRequestException('Company not found');

    await this.companyModel.updateOne(
      { _id: id },
      {
        deletedBy: {
          _id: user._id,
          email: user.email,
        },
      },
    );

    await this.redisService.invalidateCompaniesCache();

    return this.companyModel.softDelete({ _id: id });
  }

  async countCompanies() {
    return this.companyModel.countDocuments();
  }

  // HR requests to join a company
  async requestJoinCompany(companyId: string, user: IUser) {
    if (!mongoose.Types.ObjectId.isValid(companyId)) {
      throw new NotFoundException('Company not found');
    }

    const company = await this.companyModel.findOne({ _id: companyId });
    if (!company) throw new NotFoundException('Company not found');

    // Check if already a member
    const hrsInCompany = await this.usersService.findAllByCompanyId(companyId);
    if (hrsInCompany.some((hr) => hr._id.toString() === user._id.toString())) {
      throw new BadRequestException('Bạn đã là thành viên của công ty này');
    }

    // Check if already pending
    const pending = company.pendingHrs || [];
    if (pending.some((p) => p.userId === user._id.toString())) {
      throw new BadRequestException('Bạn đã gửi yêu cầu tham gia trước đó');
    }

    // Add to pending list
    await this.companyModel.updateOne(
      { _id: companyId },
      {
        $push: {
          pendingHrs: {
            userId: user._id.toString(),
            name: user.name,
            email: user.email,
            avatar: user.avatar || '',
            requestedAt: new Date(),
          },
        },
      },
    );

    // Notify to HR who created the company

    const hrId = company.createdBy?._id?.toString();

    const content = `${user.name} (${user.email}) muốn tham gia công ty ${company.name}. Hãy duyệt yêu cầu!`;
    await this.notificationService.create({
      userId: hrId,
      title: 'Yêu cầu tham gia công ty',
      content,
      type: NotificationType.COMPANY,
      targetType: NotificationTargetType.COMPANY,
      targetId: companyId,
      data: { companyId, requestUserId: user._id.toString() },
    });

    return { message: 'Đã gửi yêu cầu tham gia công ty. Vui lòng chờ duyệt!' };
  }

  // Approve HR join request
  async approveHrRequest(companyId: string, userId: string, approver: IUser) {
    if (
      !mongoose.Types.ObjectId.isValid(companyId) ||
      !mongoose.Types.ObjectId.isValid(userId)
    ) {
      throw new BadRequestException('Invalid ID');
    }

    const company = await this.companyModel.findOne({ _id: companyId });
    if (!company) throw new NotFoundException('Company not found');

    // Only the company creator can approve HR requests
    if (company.createdBy?._id?.toString() !== approver._id.toString()) {
      throw new BadRequestException(
        'Chỉ người tạo công ty mới có quyền duyệt yêu cầu tham gia',
      );
    }

    const pending = company.pendingHrs || [];
    const request = pending.find((p) => p.userId === userId);
    if (!request) {
      throw new BadRequestException('Không tìm thấy yêu cầu tham gia');
    }

    // Remove from pending list
    await this.companyModel.updateOne(
      { _id: companyId },
      { $pull: { pendingHrs: { userId } } },
    );

    // Add user to company
    await this.usersService.updateUserCompany(userId, {
      _id: companyId,
      name: company.name,
    });

    // Notify the requesting user
    const content = `Bạn đã được duyệt tham gia công ty ${company.name}!`;
    const notiObj = {
      userId,
      title: 'Đã được duyệt vào công ty',
      content,
      type: NotificationType.COMPANY,
      targetType: 'company',
      targetId: companyId,
      data: { companyId },
    };
    await this.notificationService.create(notiObj as CreateNotificationDto);

    return { message: `Đã duyệt ${request.name} vào công ty` };
  }

  // Reject HR join request
  async rejectHrRequest(companyId: string, userId: string, approver: IUser) {
    if (
      !mongoose.Types.ObjectId.isValid(companyId) ||
      !mongoose.Types.ObjectId.isValid(userId)
    ) {
      throw new BadRequestException('Invalid ID');
    }

    const company = await this.companyModel.findOne({ _id: companyId });
    if (!company) throw new NotFoundException('Company not found');

    // Only the company creator can reject HR requests
    if (company.createdBy?._id?.toString() !== approver._id.toString()) {
      throw new BadRequestException(
        'Chỉ người tạo công ty mới có quyền từ chối yêu cầu tham gia',
      );
    }

    const pending = company.pendingHrs || [];
    const request = pending.find((p) => p.userId === userId);
    if (!request) {
      throw new BadRequestException('Không tìm thấy yêu cầu tham gia');
    }

    // Remove from pending list
    await this.companyModel.updateOne(
      { _id: companyId },
      { $pull: { pendingHrs: { userId } } },
    );

    // Notify the requesting user
    const content = `Yêu cầu tham gia công ty ${company.name} đã bị từ chối.`;
    const notiObj = {
      userId,
      title: 'Yêu cầu tham gia bị từ chối',
      content,
      type: NotificationType.COMPANY,
      targetType: 'none',
      data: { companyId },
    };
    await this.notificationService.create(notiObj as CreateNotificationDto);

    return { message: `Đã từ chối yêu cầu của ${request.name}` };
  }

  // Check if a user is the company creator
  async isCompanyCreator(companyId: string, userId: string): Promise<boolean> {
    if (!mongoose.Types.ObjectId.isValid(companyId)) return false;
    const company = await this.companyModel.findOne({ _id: companyId });
    if (!company) return false;
    return company.createdBy?._id?.toString() === userId;
  }

  // Get pending HR requests for a company
  async getPendingHrs(companyId: string) {
    if (!mongoose.Types.ObjectId.isValid(companyId)) {
      throw new NotFoundException('Company not found');
    }

    const company = await this.companyModel.findOne({ _id: companyId });
    if (!company) throw new NotFoundException('Company not found');

    return company.pendingHrs || [];
  }

  // Create company by HR (separate from registration)
  async createCompanyByHr(createCompanyDto: CreateCompanyDto, user: IUser) {
    const companyExist = await this.companyModel.findOne({
      name: createCompanyDto.name,
    });

    if (companyExist) throw new BadRequestException('Tên công ty đã tồn tại');

    const newCompany = await this.companyModel.create({
      ...createCompanyDto,
      isActive: false,
      createdBy: {
        _id: user._id,
        email: user.email,
      },
    });

    // Assign company to the HR user
    await this.usersService.updateUserCompany(user._id.toString(), {
      _id: newCompany._id.toString(),
      name: newCompany.name,
    });

    await this.redisService.invalidateCompaniesCache();

    // Notify all admins about the new company
    const admins = await this.usersService.findAllAdmins();
    if (admins && admins.length > 0) {
      const adminIds = admins.map((admin) => admin._id.toString());
      const title = 'Công ty mới được tạo';
      const content = `Công ty: ${newCompany.name} đã được tạo bởi HR: ${user.name}. Duyệt ngay!`;
      await this.notificationService.createBulk(
        adminIds,
        title,
        content,
        NotificationType.COMPANY,
        NotificationTargetType.COMPANY,
        newCompany._id.toString(),
        { companyId: newCompany._id.toString() },
      );
    }

    return newCompany;
  }
}
