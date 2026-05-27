import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY, Role } from '../decorator/customize';

/**
 * Guard phân quyền (Authorization) dựa trên vai trò (Role) của người dùng
 * Quyết định xem một Request có được phép truy cập vào Endpoint hay không
 */
@Injectable()
export class RolesGuard implements CanActivate {
  // Inject Reflector để đọc các metadata (metadata về các quyền được cấu hình trên các API)
  constructor(private reflector: Reflector) {}

  /**
   * Phương thức cốt lõi của CanActivate, trả về true nếu hợp lệ (cho phép đi qua) và false nếu bị chặn
   */
  canActivate(context: ExecutionContext): boolean {
    // API gọi ngoài (Reflector): Đọc danh sách các Roles yêu cầu được gắn ở Method (Handler) hoặc Class (Controller)
    // Nếu cả 2 nơi đều có cấu hình, quyền cấu hình ở cấp Method sẽ ghi đè (Override) cấp Class
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(), // Đọc metadata tại function xử lý cụ thể
      context.getClass(),   // Đọc metadata tại toàn bộ Controller class
    ]);

    // Nếu endpoint này tự do, không yêu cầu bất kỳ role cụ thể nào -> Cho phép truy cập
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    // Chuyển đổi ngữ cảnh thực thi sang giao thức HTTP và bóc tách đối tượng Request
    // Đối tượng `user` thường đã được JwtAuthGuard đi trước đó xác thực và đính kèm vào Request
    const { user } = context.switchToHttp().getRequest();

    // Nếu không tìm thấy thông tin user hoặc user không có quyền (role) nào -> Chặn truy cập
    if (!user || !user.role) {
      return false;
    }

    // Logic kiểm tra quyền: Đối chiếu xem Role của user hiện tại có nằm trong danh sách Role yêu cầu hay không
    // Trả về true (Hợp lệ) hoặc false (NestJS sẽ tự động ném ra lỗi 403 Forbidden Exception)
    return requiredRoles.includes(user.role);
  }
}