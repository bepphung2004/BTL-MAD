import { Controller, Get, Post, UseGuards, Body } from '@nestjs/common';
import { MailService } from './mail.service';
import { ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { Roles, Role, ResponseMessage } from 'src/decorator/customize';
import { RolesGuard } from 'src/guards/roles.guard';

/**
 * Controller chịu trách nhiệm định tuyến và xử lý các yêu cầu liên quan đến gửi Email hệ thống
 */
@Controller('mail')
@ApiTags('Mail Controller') // Gắn nhãn để gom nhóm endpoint này trên tài liệu Swagger UI
export class MailController {
  // Inject MailService để đảm nhận logic cấu hình và điều khiển luồng gửi email
  constructor(private readonly mailService: MailService) {}

  /**
   * Endpoint POST /mail/send-interview-invite : Gửi thư mời phỏng vấn cho ứng viên
   * Yêu cầu xác thực tài khoản và chỉ cho phép nhân sự (HR) thực hiện
   */
  @Post('/send-interview-invite')
  // Kích hoạt các lớp bảo vệ: JwtAuthGuard (Xác thực Token hợp lệ) -> RolesGuard (Kiểm tra quyền truy cập)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.HR) // Metadata định nghĩa vai trò bắt buộc phải là HR để đi qua RolesGuard
  @ResponseMessage('Send interview invite email') // Định nghĩa thông báo phản hồi thành công trả về Client
  async sendInterviewInvite(@Body() body: { email: string; subject: string; content: string }) {
    
    // API gọi ngoài (MailService): Kích hoạt tiến trình gửi mail bất đồng bộ (Không dùng await)
    // Mục đích: Phản hồi ngay lập tức cho Client, giúp tối ưu trải nghiệm người dùng và tránh nghẽn luồng xử lý do gửi mail mất thời gian.
    this.mailService.sendInterviewInvite(body.email, body.subject, body.content);
    
    // Trả về thông báo thành công cho Client ngay khi tiến trình gửi mail bắt đầu chạy ngầm
    return { message: 'Interview invite is being sent' };
  }
}