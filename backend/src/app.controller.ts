import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { Public, ResponseMessage } from './decorator/customize';
import { ApiTags } from '@nestjs/swagger';

/**
 * Controller xử lý các yêu cầu cơ bản của ứng dụng hệ thống (Tổng quan, kiểm tra trạng thái)
 */
@Controller()
@ApiTags('App Controller') // Gom nhóm các endpoint này vào nhóm 'App Controller' trong tài liệu Swagger UI
export class AppController {
  // Inject AppService để xử lý các logic nghiệp vụ tương ứng
  constructor(private readonly appService: AppService) {}

  /**
   * Endpoint GET / : Lấy lời chào mặc định khi truy cập vào trang chủ của API Backend
   */
  @Get()
  @Public() // Bỏ qua bộ lọc xác thực (Không yêu cầu JWT/Token khi gọi API này)
  @ResponseMessage('Welcome to Backend2 API') // Định nghĩa thông báo trả về thành công cho Client qua Interceptor
  getHello(): string {
    // Gọi API/Phương thức từ AppService để lấy chuỗi dữ liệu chào mừng
    return this.appService.getHello();
  }

  /**
   * Endpoint GET /health : Kiểm tra tình trạng hoạt động (Health check) của hệ thống/server
   */
  @Get('health')
  @Public() // Bỏ qua bộ lọc xác thực (Hệ thống giám sát bên ngoài có thể gọi tự do)
  @ResponseMessage('Health check') // Định nghĩa thông báo phản hồi thành công
  getHealthCheck() {
    // Gọi phương thức kiểm tra sức khỏe hệ thống (DB, Redis, RAM,...) từ AppService
    return this.appService.getHealthCheck();
  }
}