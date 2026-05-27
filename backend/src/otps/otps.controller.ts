// Import decorator và service cần thiết
import { Controller, Post, Body } from '@nestjs/common';

import { OtpsService } from './otps.service';
import { CreateOtpDto } from './dto/create-otp.dto';
import { ApiTags } from '@nestjs/swagger';

// Controller xử lý các API liên quan đến OTP
@Controller('otps')
@ApiTags('OTPs Controller')
export class OtpsController {

  // Inject OtpsService
  constructor(private readonly otpsService: OtpsService) {}

  // API tạo và gửi OTP
  @Post()
  create(@Body() createOtpDto: CreateOtpDto) {

    // Gọi service tạo OTP
    return this.otpsService.create(createOtpDto);
  }

  // API kiểm tra OTP
  @Post('verify-otp')
  checkToken(@Body() body: { otp: string }) {

    // Kiểm tra mã OTP hợp lệ hay không
    return this.otpsService.checkToken(body.otp);
  }
}