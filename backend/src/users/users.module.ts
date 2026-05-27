// Import các module, service và schema cần thiết
import { forwardRef, Module } from '@nestjs/common';

import { UsersService } from './users.service';
import { UsersController } from './users.controller';

import { MongooseModule } from '@nestjs/mongoose';

import {
  User,
  UserSchema,
} from './schemas/user.schema';

import {
  Company,
  CompanySchema,
} from 'src/companies/schemas/company.schema';

import { OtpsModule } from 'src/otps/otps.module';
import { MailModule } from 'src/mail/mail.module';

// Module quản lý chức năng user
@Module({
  imports: [

    // Khai báo schema User và Company cho MongoDB
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Company.name, schema: CompanySchema },
    ]),

    // Import OtpsModule, dùng forwardRef để tránh circular dependency
    forwardRef(() => OtpsModule),

    // Module gửi email
    MailModule,
  ],

  // Controller xử lý API user
  controllers: [UsersController],

  // Service xử lý logic user
  providers: [UsersService],

  // Export để module khác có thể sử dụng
  exports: [UsersService, UsersModule],
})
export class UsersModule {}