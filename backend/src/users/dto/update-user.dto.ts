// Import các decorator validate dữ liệu
import { IsEmail, IsEnum, IsOptional } from 'class-validator';

import mongoose from 'mongoose';

import { Type } from 'class-transformer';

import {
  IsObject,
  ValidateNested,
  IsNotEmpty,
} from 'class-validator';

import { Role } from 'src/decorator/customize';

// Class mô tả thông tin công ty
class Company {

  // ID công ty
  @IsOptional()
  _id: mongoose.Schema.Types.ObjectId;

  // Tên công ty
  @IsOptional()
  name: string;
}

// DTO dùng để cập nhật thông tin user
export class UpdateUserDto {

  // Email user
  @IsOptional()

  // Kiểm tra định dạng email
  @IsEmail({}, { message: 'Invalid email format' })
  email?: string;

  // Vai trò của user
  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  // Tên user
  @IsOptional()
  name?: string;

  // Tuổi
  @IsOptional()
  age?: number;

  // Giới tính
  @IsOptional()
  gender?: string;

  // Địa chỉ
  @IsOptional()
  address?: string;

  // Ảnh đại diện
  @IsOptional()
  avatar?: string;

  // Thông tin công ty
  @IsOptional()

  // Kiểm tra object hợp lệ
  @IsObject()

  // Validate object lồng nhau
  @ValidateNested()

  // Chuyển kiểu dữ liệu sang Company
  @Type(() => Company)
  company?: Company;
}

// DTO dùng để đổi mật khẩu
export class UpdateUserPasswordDto {

  // Mật khẩu cũ
  @IsNotEmpty()
  oldPassword: string;

  // Mật khẩu mới
  @IsNotEmpty()
  newPassword: string;
}