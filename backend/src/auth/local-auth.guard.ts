// Import decorator Injectable và AuthGuard
import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

// Guard dùng để xác thực đăng nhập bằng strategy "local"
// Strategy này kiểm tra username/email và password
@Injectable()
export class LocalAuthGuard extends AuthGuard('local') {}