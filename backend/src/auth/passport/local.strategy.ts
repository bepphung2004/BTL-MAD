import { Strategy } from 'passport-local';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { AuthService } from '../auth.service';
// LocalStrategy: xác thực username/password khi user đăng nhập
@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  // Inject AuthService; cấu hình field dùng làm username
  constructor(private authService: AuthService) {
    super({
      usernameField: 'username',
    });
  }

  // Kiểm tra username/password; ném Unauthorized nếu sai, Forbidden nếu bị khóa
  async validate(username: string, password: string): Promise<any> {
    const user = await this.authService.validateUser(username, password);
    if (!user) {
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng!');
    }

    if (user.isLocked) {
      throw new ForbiddenException(
        'Tài khoản của bạn đã bị khóa. Vui lòng liên hệ Admin để biết thêm chi tiết.'
      );
    }

    return user;
  }
}
