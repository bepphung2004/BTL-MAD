// Import các module và service cần thiết
import { forwardRef, Module } from '@nestjs/common';

import { OtpsService } from './otps.service';
import { OtpsController } from './otps.controller';

import { MongooseModule } from '@nestjs/mongoose';
import { Otp, OtpSchema } from './schemas/otp.schema';

import { UsersModule } from 'src/users/users.module';
import { MailModule } from 'src/mail/mail.module';

// Module quản lý chức năng OTP
@Module({
  imports: [

    // Khai báo schema OTP cho MongoDB
    MongooseModule.forFeature([
      { name: Otp.name, schema: OtpSchema },
    ]),

    // Import UsersModule, dùng forwardRef để tránh circular dependency
    forwardRef(() => UsersModule),

    // Module gửi email OTP
    MailModule,
  ],

  // Controller xử lý API OTP
  controllers: [OtpsController],

  // Service xử lý logic OTP
  providers: [OtpsService],

  // Export để module khác có thể sử dụng
  exports: [OtpsService, OtpsModule],
})
export class OtpsModule {}