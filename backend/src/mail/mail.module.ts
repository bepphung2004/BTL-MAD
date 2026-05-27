import { Module } from '@nestjs/common';
import { MailService } from './mail.service';
import { MailController } from './mail.controller';
import { MailerModule } from '@nestjs-modules/mailer';
import { ConfigService } from '@nestjs/config';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter';
import { join } from 'path';
import { existsSync } from 'fs';
import { MongooseModule } from '@nestjs/mongoose';
import { Subscriber, SubscriberSchema } from 'src/subscribers/schemas/subscriber.schema';
import { Job, JobSchema } from 'src/jobs/schemas/job.schema';

/**
 * Module quản lý toàn bộ cấu hình, kết nối SMTP gửi email và các thực thể dữ liệu liên quan đến Mail
 */
@Module({
  imports: [
    // API gọi ngoài (MailerModule): Cấu hình bất đồng bộ (Async) hệ thống gửi mail sử dụng cấu hình từ ConfigService
    MailerModule.forRootAsync({
      useFactory: async (configService: ConfigService) => ({
        // Cấu hình giao thức truyền tải dữ liệu SMTP (Transport)
        transport: {
          host: configService.get<string>('EMAIL_HOST'), // Địa chỉ máy chủ SMTP (ví dụ: smtp.gmail.com)
          secure: false, // Sử dụng TLS (false có nghĩa là nâng cấp cổng thông qua STARTTLS)
          auth: {
            user: configService.get<string>('EMAIL_AUTH_USER'),     // Tài khoản email gửi đi
            pass: configService.get<string>('EMAIL_AUTH_PASSWORD'), // Mật khẩu ứng dụng (App Password)
          },
        },
        // Cấu hình thông tin mặc định cho các email gửi đi
        defaults: {
          from: `"No Reply" <${configService.get<string>('EMAIL_AUTH_USER')}>`,
        },
        // Cấu hình bộ chuyển đổi và đường dẫn lưu trữ giao diện mẫu (Template) của Email
        template: (() => {
          // 1. Ưu tiên tìm thư mục template đã được biên dịch trong thư mục đầu ra (dist/mail/templates)
          const compiledDir = join(__dirname, 'templates');
          
          // 2. Phương án dự phòng: Tìm ở thư mục gốc chứa mã nguồn (src/mail/templates) khi chạy bằng ts-node/chưa copy build
          const srcDir = join(process.cwd(), 'src', 'mail', 'templates');
          
          // Kiểm tra xem thư mục biên dịch có tồn tại hay không để chọn đường dẫn chính xác
          const dir = existsSync(compiledDir) ? compiledDir : srcDir;
          
          return {
            dir,
            adapter: new HandlebarsAdapter(), // Sử dụng Handlebars làm template engine để render HTML tĩnh cho email
            options: { strict: true },        // Bật chế độ kiểm tra dữ liệu truyền vào template nghiêm ngặt
          };
        })(),
        // API gọi ngoài: Bật/Tắt chế độ xem trước (Preview) email trên trình duyệt khi ở môi trường phát triển (Development)
        preview: configService.get<string>('EMAIL_PREVIEW') === 'true',
      }),
      inject: [ConfigService], // Inject ConfigService để cung cấp các biến môi trường (.env) cho factory ở trên
    }),

    // API gọi ngoài (MongooseModule): Đăng ký các Model schema phục vụ cho việc truy vấn dữ liệu trong MailService
    MongooseModule.forFeature([
      { name: Subscriber.name, schema: SubscriberSchema }, // Model quản lý danh sách người đăng ký nhận tin tuyển dụng
      { name: Job.name, schema: JobSchema },               // Model quản lý thông tin các công việc tuyển dụng
    ]),
  ],
  controllers: [MailController], // Đăng ký Controller tiếp nhận và định tuyến các HTTP Request về Mail
  providers: [MailService],      // Đăng ký Service chứa các logic xử lý nghiệp vụ gửi Mail trong nội bộ Module này
  exports: [MailService],        // Xuất MailService để các Module khác (như AuthModule, UsersModule,...) có thể tái sử dụng
})
export class MailModule {}