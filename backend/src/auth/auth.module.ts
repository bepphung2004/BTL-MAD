// Import các module và service cần thiết cho authentication
import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UsersModule } from 'src/users/users.module';
import { PassportModule } from '@nestjs/passport';
import { LocalStrategy } from './passport/local.strategy';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtStrategy } from './passport/jwt.strategy';
import ms from 'ms';
import { AuthController } from './auth.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from 'src/users/schemas/user.schema';
import { CompaniesModule } from 'src/companies/companies.module';
import { NotificationsModule } from 'src/notifications/notifications.module';

// Module quản lý chức năng authentication
@Module({
  imports: [
    UsersModule, // Module quản lý user
    CompaniesModule, // Module quản lý công ty
    PassportModule, // Hỗ trợ xác thực Passport
    NotificationsModule, // Module gửi thông báo

    // Cấu hình JWT access token
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        // Secret key dùng để ký token
        secret: configService.get<string>('JWT_SECRET'),

        signOptions: {
          // Thời gian hết hạn token
          expiresIn: ms(configService.get<string>('JWT_EXPIRES_IN')) / 1000,
        },
      }),
      inject: [ConfigService],
    }),

    // Cấu hình JWT refresh token
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        // Secret key riêng cho refresh token
        secret: configService.get<string>('JWT_REFRESH_SECRET'),

        signOptions: {
          // Thời gian hết hạn refresh token
          expiresIn:
            ms(configService.get<string>('JWT_REFRESH_EXPIRES_IN')) / 1000,
        },
      }),
      inject: [ConfigService],

      // Cho phép dùng JwtModule toàn cục
      global: true,
    }),

    // Khai báo schema User cho MongoDB
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
  ],

  // Controller xử lý API auth
  controllers: [AuthController],

  // Các service và strategy được cung cấp
  providers: [AuthService, LocalStrategy, JwtStrategy],

  // Export để module khác có thể sử dụng
  exports: [AuthService, LocalStrategy],
})
export class AuthModule {}