// Import các decorator, guard và service cần thiết
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Res,
} from '@nestjs/common';

import { UsersService } from './users.service';

import { RegisterUserDto } from './dto/create-user.dto';
import {
  UpdateUserDto,
  UpdateUserPasswordDto,
} from './dto/update-user.dto';

import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';

import { IUser } from './users.interface';

import {
  User,
  Roles,
  Role,
} from 'src/decorator/customize';

import { Response } from 'express';

import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { RolesGuard } from 'src/guards/roles.guard';

// Controller xử lý các API liên quan đến user
@Controller('users')
@ApiTags('User Controller')
export class UsersController {

  // Inject UsersService
  constructor(private readonly usersService: UsersService) {}

  // API tạo user (chỉ Admin)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Create user (Admin only)' })
  @ApiBearerAuth()
  @ApiResponse({
    status: 201,
    description: 'Create user successfully',
  })
  @Post()
  create(@Body() registerUserDto: RegisterUserDto) {
    // Tạo user mới
    return this.usersService.create(registerUserDto);
  }

  // API lấy danh sách user
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Get users list (Admin/HR only)',
  })
  @ApiBearerAuth()
  @ApiResponse({
    status: 200,
    description: 'Get users list successfully',
  })
  // Query current page
  @ApiQuery({
    name: 'current',
    required: false,
    description: 'Current page number',
    example: 1,
  })
  // Query page size
  @ApiQuery({
    name: 'pageSize',
    required: false,
    description: 'Number of items per page',
    example: 10,
  })
  @Get()
  findAll(@Query() qs: string) {
    // Lấy danh sách user có phân trang
    return this.usersService.findAll(qs);
  }

  // API lấy thông tin user theo id
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get user by id' })
  @ApiBearerAuth()
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  // API cập nhật thông tin user
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Update user information' })
  @ApiBearerAuth()
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
    @User() user: IUser,
  ) {
    // Admin có thể update mọi user
    // User thường chỉ update được chính mình
    const targetId =
      user.role === Role.ADMIN ? id : user._id;
    return this.usersService.update(
      targetId,
      updateUserDto,
      user,
    );
  }

  // API xóa user (chỉ Admin)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Delete user by id (Admin only)',
  })
  @ApiBearerAuth()
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }

  // API đổi mật khẩu
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Update user password' })
  @ApiBearerAuth()
  @Post('/change-password')
  updatePassword(
    @User() user: IUser,
    @Body() updateUserDto: UpdateUserPasswordDto,
  ) {
    return this.usersService.updatePassword(
      user._id,
      updateUserDto,
    );
  }

  // API đếm số lượng user
  @ApiOperation({ summary: 'Count users record' })
  @Get('/record/count')
  countUser() {
    return this.usersService.countUser();
  }

  // API xóa HR khỏi công ty
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.HR)
  @ApiOperation({
    summary: 'Remove HR from company (Admin/HR only)',
  })
  @ApiBearerAuth()
  @Post('/hrs/remove-from-company')
  removeHrFromCompany(
    @Body() body: { hrId: string; companyId: string },
    @User() user: IUser,
  ) {
    return this.usersService.removeHrFromCompany(
      body.hrId,
      body.companyId,
      user,
    );
  }

  // API HR rời công ty
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.HR)
  @ApiOperation({
    summary: 'Leave company (for non-creator HRs)',
  })
  @ApiBearerAuth()
  @Post('/leave-company')
  leaveCompany(@User() user: IUser) {
    return this.usersService.leaveCompany(user);
  }

  // API khóa tài khoản user
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Lock user account (Admin only)',
  })
  @ApiBearerAuth()
  @ApiResponse({
    status: 200,
    description: 'Lock user successfully',
  })
  @Post(':id/lock')
  lockUser(
    @Param('id') id: string,
    @Body() body: { reason?: string },
    @User() user: IUser,
  ) {
    return this.usersService.lockUser(
      id,
      body.reason,
      user,
    );
  }

  // API mở khóa tài khoản user
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Unlock user account (Admin only)',
  })
  @ApiBearerAuth()
  @ApiResponse({
    status: 200,
    description: 'Unlock user successfully',
  })
  @Post(':id/unlock')
  unlockUser(
    @Param('id') id: string,
    @User() user: IUser,
  ) {
    return this.usersService.unlockUser(id, user);
  }

  // API lấy danh sách candidate (role USER)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary:
      'Get all candidates - USER role only (Admin only)',
  })
  @ApiBearerAuth()
  @ApiResponse({
    status: 200,
    description: 'Get candidates list successfully',
  })
  @ApiQuery({
    name: 'current',
    required: false,
    description: 'Current page number',
    example: 1,
  })
  @ApiQuery({
    name: 'pageSize',
    required: false,
    description: 'Number of items per page',
    example: 10,
  })
  @Get('/admin/candidates')
  findAllCandidates(@Query() qs: string) {
    return this.usersService.findAllCandidates(qs);
  }

  // API duyệt tài khoản HR
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Approve HR account (Admin only)',
  })
  @ApiBearerAuth()
  @Post(':id/approve-hr')
  approveHr(
    @Param('id') id: string,
    @User() user: IUser,
  ) {
    return this.usersService.approveHr(id, user);
  }

  // API lấy danh sách HR chờ duyệt
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Get pending HR accounts (Admin only)',
  })
  @ApiBearerAuth()
  @Get('/admin/pending-hrs')
  findPendingHrs() {
    return this.usersService.findPendingHrs();
  }
}