// Import các decorator, exception và guard cần thiết
import {
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from 'src/decorator/customize';

// Guard dùng để bảo vệ route bằng JWT
// Đồng thời hỗ trợ bỏ qua xác thực với route @Public()
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  
  // Inject Reflector để đọc metadata từ decorator
  constructor(private reflector: Reflector) {
    super();
  }

  // Kiểm tra route có cần xác thực hay không
  canActivate(context: ExecutionContext) {

    // Lấy metadata từ @Public()
    const isPublic = this.reflector.getAllAndOverride<boolean>(
      IS_PUBLIC_KEY,
      [
        context.getHandler(), // Method
        context.getClass(),   // Controller
      ],
    );

    // Nếu route là public thì cho phép truy cập
    if (isPublic) {
      return true;
    }

    // Nếu không thì kiểm tra JWT
    return super.canActivate(context);
  }

  // Xử lý sau khi xác thực JWT
  handleRequest(err, user, info, context: ExecutionContext) {

    // Nếu token lỗi hoặc không có user
    if (err || !user) {
      throw err || new UnauthorizedException('Token không hợp lệ!');
    }

    // Trả về thông tin user đã decode từ JWT
    return user;
  }
}