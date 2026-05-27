// Import các decorator, service và thư viện cần thiết
import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Response } from 'express';
import ms from 'ms';
import { SoftDeleteModel } from 'soft-delete-plugin-mongoose';

import { User, UserDocument } from 'src/users/schemas/user.schema';
import { IUser } from 'src/users/users.interface';
import { UsersService } from 'src/users/users.service';
import { CreateUserDto, RegisterUserDto } from 'src/users/dto/create-user.dto';

import crypto from 'crypto';
import { Role } from 'src/decorator/customize';
import { CreateHrDto } from 'src/users/dto/create-hr.dto';
import { CompaniesService } from 'src/companies/companies.service';
import { Types } from 'mongoose';

import { NotificationsService } from 'src/notifications/notifications.service';
import {
  NotificationTargetType,
  NotificationType,
} from 'src/notifications/schemas/notification.schema';

// Service xử lý authentication
@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private userModel: SoftDeleteModel<UserDocument>,

    private configService: ConfigService,
    private usersService: UsersService,
    private jwtService: JwtService,
    private companiesService: CompaniesService,
    private notificationsService: NotificationsService,
  ) {}

  // Kiểm tra tài khoản đăng nhập
  async validateUser(username: string, pass: string): Promise<any> {
    // Tìm user theo email/username
    const user = await this.usersService.findUserByUsername(username);

    if (user) {
      // Kiểm tra tài khoản có bị khóa không
      if (user.isLocked) {
        return { isLocked: true, lockedReason: user.lockedReason };
      }

      // Kiểm tra mật khẩu
      const isValid = this.usersService.checkPassword(pass, user.password);

      if (isValid) {
        // Trả về user nhưng ẩn password
        return {
          ...user.toObject(),
          password: undefined,
        };
      }
    }

    return null;
  }

  // Đặt lại mật khẩu
  async resetPassword(token: string, password: string) {
    // Kiểm tra token reset password
    const user = await this.usersService.forgotPassword(token);

    if (!user) {
      throw new BadRequestException('Invalid token');
    }

    // Hash mật khẩu mới
    const hashedPassword = this.usersService.hashPassword(password);

    // Cập nhật mật khẩu
    await this.userModel.updateOne(
      { _id: user._id },
      { password: hashedPassword },
    );

    return { message: 'Password reset successfully' };
  }

  // Tạo refresh token
  generateRefreshToken = (payload: any) => {
    return this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET'),

      // Thời gian hết hạn refresh token
      expiresIn:
        ms(this.configService.get<string>('JWT_REFRESH_EXPIRES_IN')) / 1000,
    });
  };

  // Xử lý đăng nhập
  async login(user: IUser, res: Response) {
    // Lấy thông tin cần thiết từ user
    const { _id, name, email, role, age, gender, address, avatar } = user;

    // Payload lưu trong JWT
    const payload = {
      sub: 'token login',
      iss: 'from server',
      email,
      _id,
      role,
      name,
      age,
      gender,
      address,
      avatar,
    };

    // Tạo refresh token và access token
    const refreshToken = this.generateRefreshToken(payload);

    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_SECRET'),

      expiresIn: ms(this.configService.get<string>('JWT_EXPIRES_IN')) / 1000,
    });

    // Lưu refresh token vào database
    await this.usersService.updateUserToken(refreshToken, _id);

    // Lưu refresh token vào cookie
    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      maxAge:
        ms(this.configService.get<string>('JWT_REFRESH_EXPIRES_IN')) * 1000,
      sameSite: 'none',
      secure: true,
    });

    // Dữ liệu trả về cho client
    const userData: any = {
      _id,
      email,
      name,
      role,
      age: user.age,
      gender: user.gender,
      address: user.address,
      avatar: user.avatar,
    };

    // Nếu là HR thì thêm thông tin công ty và trạng thái duyệt
    if (user.role === Role.HR) {
      if (user.company) {
        userData.company = user.company;
      }

      userData.isApproved = user.isApproved !== false;
    }

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      user: userData,
    };
  }

  // Đăng ký user thông thường
  async register(createUserDto: CreateUserDto) {
    // Kiểm tra email đã tồn tại chưa
    const isExistEmail = await this.userModel.findOne({
      email: createUserDto.email,
    });

    if (isExistEmail) {
      throw new BadRequestException('Email already exists');
    }

    // Hash mật khẩu
    createUserDto.password = this.usersService.hashPassword(
      createUserDto.password,
    );

    // Tạo user mới
    const newUser = await this.userModel.create({
      ...createUserDto,

      // Role mặc định là USER
      role: Role.USER,
    });

    return {
      _id: newUser._id,
      createdAt: newUser.createdAt,
    };
  }

  // Đăng nhập bằng Google OAuth
  async googleLogin(req: any, res: Response) {
    const { user } = req;

    // Kiểm tra email đã tồn tại chưa
    const isExistEmail = (await this.userModel.findOne({
      email: user.email,
    })) as unknown as IUser;

    let currentUser: IUser;

    // Tạo mật khẩu random cho tài khoản Google
    const newPassword = crypto.randomBytes(20).toString('hex');

    const hashedPassword = this.usersService.hashPassword(newPassword);

    // Nếu chưa có tài khoản thì tạo mới
    if (!isExistEmail) {
      currentUser = (await this.userModel.create({
        email: user.email,
        name: user.firstName + ' ' + user.lastName,
        role: Role.USER,
        password: hashedPassword,
      })) as unknown as IUser;
    } else {
      // Nếu đã có thì cập nhật tên
      await this.userModel.updateOne(
        { email: user.email },
        { $set: { name: user.firstName + ' ' + user.lastName } },
      );

      currentUser = {
        email: isExistEmail.email,
        _id: isExistEmail._id,
        role: isExistEmail.role,
        name: user.firstName + ' ' + user.lastName,
        age: isExistEmail.age,
        avatar: isExistEmail.avatar,
      };
    }

    // Payload JWT
    const payload = {
      sub: 'token login',
      iss: 'from server',
      email: currentUser.email,
      _id: currentUser._id,
      role: currentUser.role,
      name: currentUser.name,
    };

    // Tạo token
    const refreshToken = this.generateRefreshToken(payload);

    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_SECRET'),

      expiresIn: ms(this.configService.get<string>('JWT_EXPIRES_IN')) / 1000,
    });

    // Lưu refresh token
    await this.usersService.updateUserToken(refreshToken, currentUser._id);

    // Lưu cookie
    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      maxAge:
        ms(this.configService.get<string>('JWT_REFRESH_EXPIRES_IN')) * 1000,
      sameSite: 'none',
      secure: true,
    });

    return {
      access_token: accessToken,
    };
  }

  // Lấy thông tin tài khoản hiện tại
  async handleAccount(user: IUser) {
    // Lấy thông tin mới nhất từ DB
    const currUser = await this.userModel.findOne({ _id: user._id });

    const userData: any = {
      _id: currUser._id,
      email: currUser.email,
      name: currUser.name,
      role: currUser.role,
      company: currUser.company,
      age: currUser.age,
      address: currUser.address,
      gender: currUser.gender,
      avatar: currUser.avatar,
    };

    // Nếu là HR thì trả thêm trạng thái duyệt
    if (currUser.role === Role.HR) {
      userData.isApproved = (currUser as any).isApproved !== false;
    }

    return { user: userData };
  }

  // Tạo access token mới bằng refresh token
  generateNewToken = async (refreshToken: string, res: Response) => {
    try {
      // Verify refresh token
      const payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });

      if (!payload) {
        throw new BadRequestException('Invalid refresh token');
      }

      // Tìm user theo refresh token
      const user = await this.userModel.findOne({ refreshToken });

      if (user) {
        const { _id, name, email, role } = user;

        // Payload mới
        const newPayload = {
          sub: 'token login',
          iss: 'from server',
          email,
          _id,
          role,
          name,
        };

        // Tạo refresh token mới
        const newRefreshToken = this.generateRefreshToken(newPayload);

        // Cập nhật token mới vào DB
        await this.usersService.updateUserToken(
          newRefreshToken,
          _id.toString(),
        );

        // Lưu cookie mới
        res.cookie('refresh_token', newRefreshToken, {
          httpOnly: true,
          maxAge:
            ms(this.configService.get<string>('JWT_REFRESH_EXPIRES_IN')) * 1000,
          sameSite: 'none',
          secure: true,
        });

        return {
          // Tạo access token mới
          access_token: this.jwtService.sign(newPayload, {
            secret: this.configService.get<string>('JWT_SECRET'),

            expiresIn:
              ms(this.configService.get<string>('JWT_EXPIRES_IN')) / 1000,
          }),

          // Trả về thông tin user
          user: {
            _id,
            email,
            name,
            role,
            avatar: user.avatar,
          },
        };
      }
    } catch (err) {
      // Token không hợp lệ hoặc hết hạn
      throw new BadRequestException('Invalid refresh token');
    }
  };

  // Đăng ký tài khoản HR
  async registerHr(createHrDto: CreateHrDto) {
    // Tách thông tin công ty và user
    const {
      companyName,
      taxCode,
      companyScale,
      ...userDto
    } = createHrDto;

    userDto.role = Role.HR;

    // Kiểm tra email đã tồn tại chưa
    const isExistEmail = await this.userModel.findOne({
      email: createHrDto.email,
    });

    if (isExistEmail) {
      throw new BadRequestException('Email already exists');
    }

    // Hash mật khẩu
    const hashedPassword = this.usersService.hashPassword(userDto.password);

    // Thông tin công ty đăng ký
    const registrationCompany =
      companyName || taxCode || companyScale
        ? {
            name: companyName || '',
            taxCode: taxCode || '',
            scale: companyScale || '',
          }
        : undefined;

    // Tạo tài khoản HR ở trạng thái chờ duyệt
    const newUser = await this.userModel.create({
      ...userDto,
      password: hashedPassword,
      role: Role.HR,
      isApproved: false,

      ...(registrationCompany && { registrationCompany }),
    });

    // Lấy danh sách admin
    const admins = await this.userModel.find({
      role: Role.ADMIN,
      isDeleted: false,
    });

    // Gửi thông báo cho admin
    if (admins && admins.length > 0) {
      const adminIds = admins.map((a) => a._id.toString());

      const companyInfo = companyName
        ? ` - Công ty: ${companyName}`
        : '';

      const taxInfo = taxCode ? ` - MST: ${taxCode}` : '';

      const scaleInfo = companyScale
        ? ` - Quy mô: ${companyScale}`
        : '';

      const content =
        `HR ${createHrDto.name} (${createHrDto.email}) ` +
        `đã đăng ký tài khoản${companyInfo}${taxInfo}${scaleInfo}. ` +
        `Vui lòng duyệt!`;

      // Tạo notification hàng loạt
      await this.notificationsService.createBulk(
        adminIds,
        'Đăng ký HR mới',
        content,
        NotificationType.SYSTEM,
        NotificationTargetType.USER,
        newUser._id.toString(),

        {
          userId: newUser._id.toString(),
          companyName,
          taxCode,
          companyScale,
        },
      );
    }

    return {
      _id: newUser._id,
      createdAt: newUser.createdAt,
    };
  }

  // Đăng xuất
  logout = async (user: IUser, res: Response) => {
    // Xóa refresh token trong DB
    await this.usersService.updateUserToken('', user._id);

    // Xóa cookie
    res.clearCookie('refresh_token');
    res.clearCookie('userId');

    return 'Logout success!';
  };
}