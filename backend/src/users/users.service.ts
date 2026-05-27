import {
  BadRequestException,
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { RegisterUserDto } from './dto/create-user.dto';
import { UpdateUserDto, UpdateUserPasswordDto } from './dto/update-user.dto';
import { InjectModel } from '@nestjs/mongoose';
import { User, UserDocument } from './schemas/user.schema';
import { Company, CompanyDocument } from 'src/companies/schemas/company.schema';
import * as bcrypt from 'bcryptjs';
import { SoftDeleteModel } from 'soft-delete-plugin-mongoose';
import mongoose, { Model } from 'mongoose';
import aqp from 'api-query-params';
import { IUser } from './users.interface';
import { OtpsService } from 'src/otps/otps.service';
import { MailService } from 'src/mail/mail.service';
import { Role } from 'src/decorator/customize';

/**
 * Service quản lý toàn bộ logic nghiệp vụ (CRUD, phân quyền, trạng thái) của Người dùng (User)
 */
@Injectable()
export class UsersService {
  constructor(
    // Inject Model User tích hợp plugin SoftDelete (xóa mềm)
    @InjectModel(User.name) private userModel: SoftDeleteModel<UserDocument>,
    
    // Inject Model Company để truy vấn thông tin công ty liên quan
    @InjectModel(Company.name) private companyModel: Model<CompanyDocument>,
    
    // Inject OtpsService xử lý mã xác thực (dùng forwardRef để tránh lỗi vòng lặp phụ thuộc - Circular Dependency)
    @Inject(forwardRef(() => OtpsService))
    private readonly otpService: OtpsService,
    
    // Inject MailService để xử lý gửi email thông báo (nếu cần)
    private readonly mailService: MailService,
  ) {}

  /**
   * Mã hóa mật khẩu bằng thư viện bcryptjs
   */
  hashPassword = (password: string) => {
    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(password, salt);
    return hash;
  };

  /**
   * Kiểm tra mật khẩu nhập vào có khớp với mật khẩu đã mã hóa trong DB không
   */
  checkPassword = (password: string, hash: string) => {
    return bcrypt.compareSync(password, hash);
  };

  /**
   * Tạo chuỗi OTP ngẫu nhiên gồm các chữ số theo độ dài yêu cầu
   */
  generateOtp = (length: number) => {
    const digits = '0123456789';
    let OTP = '';
    for (let i = 0; i < length; i++) {
      OTP += digits[Math.floor(Math.random() * 10)];
    }
    return OTP;
  };

  /**
   * Đăng ký/Tạo mới một tài khoản người dùng
   */
  async create(registerUserDto: RegisterUserDto) {
    // Kiểm tra trùng lặp email
    const isExist = await this.userModel.findOne({
      email: registerUserDto.email,
    });
    if (isExist) {
      throw new BadRequestException('Email already exists');
    }

    // Mã hóa mật khẩu trước khi lưu DB
    registerUserDto.password = this.hashPassword(registerUserDto.password);

    // Gán quyền mặc định là USER nếu client không truyền lên
    if (!registerUserDto.role) {
      registerUserDto.role = Role.USER;
    }

    const user = await this.userModel.create(registerUserDto);
    return {
      _id: user._id,
      createdAt: user.createdAt,
    };
  }

  /**
   * Lấy danh sách người dùng kèm phân trang, tìm kiếm và sắp xếp nâng cao (Sử dụng api-query-params)
   */
  async findAll(qs: any) {
    // Phân tích query string từ URL thành các bộ lọc của Mongoose
    const { filter, sort, population } = aqp(qs);
    delete filter.current;
    delete filter.pageSize;

    // Tính toán phân trang
    const totalRecord = (await this.userModel.find(filter)).length;
    const limit = qs.pageSize ? parseInt(qs.pageSize) : 10;
    const totalPage = Math.ceil(totalRecord / limit);
    const skip = (qs.current - 1) * limit;
    const current = qs.current ? +qs.current : 1;

    // Thực hiện truy vấn loại bỏ trường nhạy cảm (password, token)
    const users = await this.userModel
      .find(filter)
      .skip(skip)
      .limit(limit)
      .sort(sort as any)
      .select('-password -refreshToken')
      .populate(population);

    return {
      meta: {
        current: current,
        pageSize: limit,
        pages: totalPage,
        total: totalRecord,
      },
      result: users,
    };
  }

  /**
   * Tìm kiếm người dùng còn hoạt động dựa vào email
   */
  async findOneByEmail(email: string) {
    return await this.userModel.findOne({ email: email, isDeleted: false });
  }

  /**
   * Tìm kiếm 1 người dùng thuộc 1 công ty cụ thể (Ẩn thông tin nhạy cảm và thông tin vết)
   */
  async findByCompanyId(companyId: string) {
    return await this.userModel
      .findOne({ 'company._id': companyId, isDeleted: false })
      .select('-password -refreshToken -createdBy -updatedBy -deletedBy _id');
  }

  /**
   * Tìm kiếm tất cả người dùng thuộc về 1 công ty
   */
  async findAllByCompanyId(companyId: string) {
    return await this.userModel
      .find({ 'company._id': companyId, isDeleted: false })
      .select('-password -refreshToken -createdBy -updatedBy -deletedBy');
  }

  /**
   * Lấy chi tiết thông tin 1 người dùng theo ID (Loại bỏ mật khẩu & token)
   */
  async findOne(id: string) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new NotFoundException('User not found');
    }

    const user = await this.userModel
      .findOne({ _id: id })
      .select('-password -refreshToken');

    if (!user) {
      throw new BadRequestException('User not found');
    }

    return user;
  }

  /**
   * Tìm người dùng còn hoạt động bằng username (email) để phục vụ cho Auth/Login
   */
  async findUserByUsername(username: string) {
    return this.userModel.findOne({ email: username, isDeleted: false });
  }

  /**
   * Tìm kiếm người dùng dựa trên Tên (Name)
   */
  async findUserByName(name: string) {
    return await this.userModel.findOne({ name: name });
  }

  /**
   * Cập nhật thông tin cá nhân và lưu vết người thực hiện cập nhật
   */
  async update(id: string, updateUserDto: UpdateUserDto, user: IUser) {
    return await this.userModel.updateOne(
      { _id: id },
      {
        ...updateUserDto,
        updatedBy: {
          _id: user._id,
          name: user.name,
          email: user.email,
        },
      },
    );
  }

  /**
   * API nội bộ: Cập nhật thông tin công ty cho tài khoản User
   */
  async updateUserCompany(userId: string, company: { _id: string; name: string }) {
    return await this.userModel.updateOne(
      { _id: userId },
      { company: company },
    );
  }

  /**
   * API nội bộ: Cập nhật vai trò (Role) của người dùng
   */
  async updateUserRole(userId: string, role: Role) {
    return await this.userModel.updateOne({ _id: userId }, { role });
  }

  /**
   * Xóa mềm (Soft Delete) người dùng theo ID thông qua plugin
   */
  async remove(id: string) {
    return await this.userModel.softDelete({ _id: id });
  }

  /**
   * Cập nhật Refresh Token mới khi người dùng đăng nhập hoặc làm mới phiên
   */
  updateUserToken = async (refreshToken: string, _id: string) => {
    await this.userModel.updateOne({ _id }, { refreshToken });
  };

  /**
   * Đổi mật khẩu cá nhân (Yêu cầu kiểm tra mật khẩu cũ)
   */
  updatePassword = async (id: string, updateUserDto: UpdateUserPasswordDto) => {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new NotFoundException('User not found');
    }

    const user = await this.userModel.findOne({ _id: id });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Xác thực mật khẩu cũ trước khi thay đổi
    if (!this.checkPassword(updateUserDto.oldPassword, user.password)) {
      throw new BadRequestException('Current password is incorrect');
    }

    return await this.userModel.updateOne(
      { _id: id },
      { password: this.hashPassword(updateUserDto.newPassword) },
    );
  };

  /**
   * API gọi ngoài (OtpsService): Kiểm tra token khôi phục mật khẩu và trả về user hợp lệ
   */
  async forgotPassword(token: string) {
    // Gọi sang OtpsService xác thực token
    const user = await this.otpService.checkToken(token);

    if (!user) {
      throw new BadRequestException('Token not found!');
    }

    // Xóa token sau khi sử dụng để tránh tái sử dụng
    await this.otpService.remove(token);

    return await this.userModel.findOne({ email: user.email });
  }

  /**
   * Đếm tổng số lượng người dùng hiện có trong hệ thống
   */
  async countUser() {
    return await this.userModel.countDocuments();
  }

  /**
   * Gỡ quyền HR khỏi công ty (Chỉ Admin hoặc chính Người tạo công ty đó mới có quyền)
   */
  async removeHrFromCompany(hrId: string, companyId: string, requester: IUser) {
    // Nếu người thực hiện không phải Admin, kiểm tra xem có phải người tạo công ty không
    if (requester.role !== Role.ADMIN) {
      const company = await this.companyModel.findOne({ _id: companyId });
      if (!company) {
        throw new NotFoundException('Công ty không tồn tại');
      }
      if (company.createdBy?._id?.toString() !== requester._id.toString()) {
        throw new BadRequestException('Chỉ người tạo công ty mới có quyền xóa HR khác');
      }
    }

    // Kiểm tra nhân sự (HR) cần gỡ có hợp lệ không
    const hr = await this.userModel.findOne({ _id: hrId, role: Role.HR, isDeleted: false });
    if (!hr) {
      throw new NotFoundException('HR not found');
    }

    if (!hr.company || hr.company._id.toString() !== companyId) {
      throw new BadRequestException('HR không thuộc công ty này');
    }

    // Xóa trường thông tin liên kết công ty ($unset)
    await this.userModel.updateOne(
      { _id: hrId },
      { $unset: { company: 1 } },
    );

    return { message: 'Xóa HR khỏi công ty thành công' };
  }

  /**
   * HR tự rời khỏi công ty hiện tại (Không áp dụng cho người tạo công ty)
   */
  async leaveCompany(user: IUser) {
    const currentUser = await this.userModel.findOne({ _id: user._id, isDeleted: false });
    if (!currentUser) {
      throw new NotFoundException('Người dùng không tồn tại');
    }

    if (!currentUser.company) {
      throw new BadRequestException('Bạn hiện không thuộc công ty nào');
    }

    const companyId = currentUser.company._id.toString();
    const company = await this.companyModel.findOne({ _id: companyId });
    if (!company) {
      throw new NotFoundException('Công ty không tồn tại');
    }

    // Chặn người tạo công ty tự rời (bắt buộc phải chuyển quyền hoặc xóa công ty trước)
    if (company.createdBy?._id?.toString() === user._id.toString()) {
      throw new BadRequestException('Người tạo công ty không thể rời công ty. Hãy chuyển quyền hoặc xóa công ty.');
    }

    // Xóa liên kết công ty khỏi hồ sơ cá nhân
    await this.userModel.updateOne(
      { _id: user._id },
      { $unset: { company: 1 } },
    );

    return { message: 'Rời công ty thành công' };
  }

  /**
   * Khóa tài khoản người dùng (Chỉ Admin thực hiện, không được tự khóa Admin)
   */
  async lockUser(userId: string, reason: string, adminUser: IUser) {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new NotFoundException('Người dùng không tồn tại');
    }

    const user = await this.userModel.findOne({ _id: userId, isDeleted: false });
    if (!user) {
      throw new NotFoundException('Người dùng không tồn tại');
    }

    if (user.role === Role.ADMIN) {
      throw new BadRequestException('Không thể khóa tài khoản Admin');
    }

    if (user.isLocked) {
      throw new BadRequestException('Tài khoản này đã bị khóa');
    }

    // Cập nhật trạng thái khóa và lý do
    await this.userModel.updateOne(
      { _id: userId },
      {
        isLocked: true,
        lockedAt: new Date(),
        lockedReason: reason || 'Vi phạm quy định của hệ thống',
        updatedBy: {
          _id: adminUser._id,
          email: adminUser.email,
        },
      },
    );

    return { message: 'Khóa tài khoản thành công' };
  }

  /**
   * Mở khóa tài khoản bị khóa trước đó (Chỉ Admin)
   */
  async unlockUser(userId: string, adminUser: IUser) {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new NotFoundException('Người dùng không tồn tại');
    }

    const user = await this.userModel.findOne({ _id: userId, isDeleted: false });
    if (!user) {
      throw new NotFoundException('Người dùng không tồn tại');
    }

    if (!user.isLocked) {
      throw new BadRequestException('Tài khoản này chưa bị khóa');
    }

    // Reset trạng thái khóa về null/false
    await this.userModel.updateOne(
      { _id: userId },
      {
        isLocked: false,
        lockedAt: null,
        lockedReason: null,
        updatedBy: {
          _id: adminUser._id,
          email: adminUser.email,
        },
      },
    );

    return { message: 'Mở khóa tài khoản thành công' };
  }

  /**
   * Phê duyệt tài khoản đăng ký quyền HR (Chỉ Admin)
   */
  async approveHr(userId: string, adminUser: IUser) {
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      throw new NotFoundException('Người dùng không tồn tại');
    }

    const user = await this.userModel.findOne({ _id: userId, isDeleted: false });
    if (!user) {
      throw new NotFoundException('Người dùng không tồn tại');
    }

    if (user.role !== Role.HR) {
      throw new BadRequestException('Người dùng không phải HR');
    }

    if (user.isApproved) {
      throw new BadRequestException('Tài khoản HR đã được duyệt');
    }

    // Chuyển cờ phê duyệt sang true
    await this.userModel.updateOne(
      { _id: userId },
      {
        isApproved: true,
        updatedBy: {
          _id: adminUser._id,
          email: adminUser.email,
        },
      },
    );

    return { message: 'Duyệt tài khoản HR thành công' };
  }

  /**
   * Lấy danh sách tất cả quản trị viên (Admin) đang hoạt động
   */
  async findAllAdmins() {
    return await this.userModel
      .find({ role: Role.ADMIN, isDeleted: false })
      .select('-password -refreshToken');
  }

  /**
   * Lấy danh sách tài khoản HR đang chờ phê duyệt (Admin Dashboard)
   */
  async findPendingHrs() {
    return await this.userModel
      .find({ role: Role.HR, isApproved: false, isDeleted: false })
      .select('-password -refreshToken')
      .sort({ createdAt: -1 }); // Mới đăng ký lên trước
  }

  /**
   * Lấy danh sách toàn bộ Ứng viên (Chỉ những tài khoản có Role.USER) kèm phân trang nâng cao
   */
  async findAllCandidates(qs: any) {
    const { filter, sort, population } = aqp(qs);
    delete filter.current;
    delete filter.pageSize;

    // Ép điều kiện bộ lọc chỉ lấy vai trò là Ứng viên (USER)
    filter.role = Role.USER;

    // Tính toán phân trang tương tự hàm findAll chung
    const totalRecord = (await this.userModel.find(filter)).length;
    const limit = qs.pageSize ? parseInt(qs.pageSize) : 10;
    const totalPage = Math.ceil(totalRecord / limit);
    const skip = (qs.current - 1) * limit;
    const current = qs.current ? +qs.current : 1;

    const users = await this.userModel
      .find(filter)
      .skip(skip)
      .limit(limit)
      .sort(sort as any)
      .select('-password -refreshToken')
      .populate(population);

    return {
      meta: {
        current: current,
        pageSize: limit,
        pages: totalPage,
        total: totalRecord,
      },
      result: users,
    };
  }
}