// Khai báo các decorator, guard, service và DTO cần dùng cho authentication
import {
  Controller,
  Post,
  UseGuards,
  Body,
  Res,
  Req,
  Get,
  BadRequestException,
} from '@nestjs/common';

import { AuthService } from './auth.service';
import { Public, User } from 'src/decorator/customize';
import { LocalAuthGuard } from './local-auth.guard';
import { CreateUserDto } from 'src/users/dto/create-user.dto';
import { Request, Response } from 'express';
import { IUser } from 'src/users/users.interface';
import { JwtAuthGuard } from './jwt-auth.guard';
import { ThrottlerGuard } from '@nestjs/throttler';
import { AuthGuard } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CreateHrDto } from 'src/users/dto/create-hr.dto';

// Controller xử lý các API liên quan đến authentication
@Controller('auth')
@ApiTags('Auth Controller')
export class AuthController {
  // Inject AuthService và ConfigService
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  // API đăng nhập
  @Public() // Cho phép truy cập không cần token
  @UseGuards(LocalAuthGuard) // Kiểm tra username/password
  @UseGuards(ThrottlerGuard) // Giới hạn số lần request
  @ApiOperation({ summary: 'Login' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        username: { type: 'string' },
        password: { type: 'string' },
      },
      example: {
        username: 'test@gmail.com',
        password: '123456',
      },
    },
  })
  @Post('/login')
  handleLogin(
    @Req() req: Request & { user: IUser }, // User được gán sau khi xác thực
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.authService.login(req.user, res);
  }

  // API đăng ký tài khoản user
  @Public()
  @ApiOperation({ summary: 'Register' })
  @Post('/register')
  handleRegister(@Body() createUserDto: CreateUserDto) {
    return this.authService.register(createUserDto);
  }

  // API lấy thông tin tài khoản hiện tại
  @UseGuards(JwtAuthGuard) // Yêu cầu access token hợp lệ
  @ApiOperation({ summary: 'Get account user' })
  @ApiBearerAuth()
  @Get('/account')
  async handleAccount(@User() user: IUser) {
    return await this.authService.handleAccount(user);
  }

  // API refresh access token bằng refresh token
  @ApiOperation({
    summary: 'Refresh token',
    description: 'Refresh token, need refresh token in cookies',
  })
  @Post('/refresh')
  handleRefresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    // Lấy refresh token từ body hoặc cookie
    const refreshToken = req.body.refresh_token || req.cookies['refresh_token'];

    // Báo lỗi nếu không có token
    if (!refreshToken) {
      throw new BadRequestException('Token không hợp lệ!');
    }

    // Tạo access token mới
    return this.authService.generateNewToken(refreshToken, res);
  }

  // API đăng xuất
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Logout', description: 'Logout user' })
  @ApiBearerAuth()
  @Post('/logout')
  handleLogout(@Res({ passthrough: true }) res: Response, @User() user: IUser) {
    return this.authService.logout(user, res);
  }

  // API đặt lại mật khẩu
  @Post('/reset-password')
  @ApiOperation({ summary: 'Reset password' })
  @Public()
  handleResetPassword(@Body() body: { token: string; password: string }) {
    // Tách token và mật khẩu mới từ request body
    const { token, password } = body;

    return this.authService.resetPassword(token, password);
  }

  // API đăng ký tài khoản HR
  @Post('/hr/register')
  @ApiOperation({ summary: 'Register HR account' })
  @Public()
  handleRegisterHr(@Body() createUserDto: CreateHrDto) {
    return this.authService.registerHr(createUserDto);
  }
}