// Import các decorator, exception và service cần thiết
import {
  BadRequestException,
  forwardRef,
  Inject,
  Injectable,
} from '@nestjs/common';

import { CreateOtpDto } from './dto/create-otp.dto';

import { InjectModel } from '@nestjs/mongoose';
import { Otp, OtpDocument } from './schemas/otp.schema';

import { SoftDeleteModel } from 'soft-delete-plugin-mongoose';

import { UsersService } from 'src/users/users.service';

import crypto from 'crypto';
import { MailService } from 'src/mail/mail.service';

// Service xử lý logic OTP
@Injectable()
export class OtpsService {

  constructor(
    // Inject model OTP từ MongoDB
    @InjectModel(Otp.name)
    private readonly otpModel: SoftDeleteModel<OtpDocument>,

    // Inject UsersService
    @Inject(forwardRef(() => UsersService))
    private userService: UsersService,

    // Service gửi email
    private readonly mailService: MailService,
  ) {}

  // Tạo OTP mới
  async create(createOtpDto: CreateOtpDto) {

    // Kiểm tra user có tồn tại không
    const isExist = await this.userService.findUserByUsername(
      createOtpDto.email,
    );

    if (!isExist) {
      throw new BadRequestException('User not found');
    }

    // Kiểm tra email đã có OTP chưa
    const existOtp = await this.otpModel.findOne({
      email: createOtpDto.email,
    });

    if (existOtp) {
      throw new BadRequestException('OTP already exists');
    }

    // Tạo mã OTP
    const otpToken = this.generateToken();

    // Dữ liệu OTP mới
    const newOtp = {
      token: otpToken,
      email: createOtpDto.email,
    };

    // Lưu OTP vào database
    const result = await this.otpModel.create(newOtp);

    // Gửi OTP qua email
    this.mailService.sendOtp(
      createOtpDto.email,
      otpToken.toString(),
    );

    return result;
  }

  // Sinh mã OTP ngẫu nhiên
  generateToken() {

    // Random số nguyên 32-bit
    const token = crypto.randomInt(0, Math.pow(2, 32));

    return token;
  }

  // Kiểm tra OTP hợp lệ
  async checkToken(token: string) {

    // Tìm OTP theo token
    const otp = await this.otpModel
      .findOne({ token: token })
      .lean()
      .exec();

    // Báo lỗi nếu không tìm thấy
    if (!otp) {
      throw new BadRequestException('Token not found');
    }

    return otp;
  }

  // Xóa OTP
  async remove(token: string) {

    // Xóa OTP theo token
    await this.otpModel.deleteOne({ token: token });
  }
}