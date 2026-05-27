// Import decorator cho schema, swagger và validation
import { Prop } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';

import { Type } from 'class-transformer';

import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsNotEmptyObject,
  IsObject,
  IsOptional,
  ValidateNested,
} from 'class-validator';

import mongoose from 'mongoose';

import { Role } from 'src/decorator/customize';

// Class mô tả thông tin công ty
export class Company {

  // ID công ty
  @IsNotEmpty()
  _id: string | mongoose.Types.ObjectId;

  // Tên công ty
  @IsOptional()
  name: string;

  // Logo công ty
  @IsOptional()
  logo?: string;

  // Trạng thái hoạt động của công ty
  @IsOptional()
  isActive?: boolean;
}

// DTO dùng cho đăng ký user đầy đủ
export class RegisterUserDto {

  // Email user
  @ApiProperty({
    example: 'user@example.com',
    description: 'The email of the user',
  })
  @IsEmail({}, { message: 'Invalid email format' })
  @IsNotEmpty({ message: 'Email cannot be empty' })
  email: string;

  // Mật khẩu
  @ApiProperty({
    example: 'password123',
    description: 'The password of the user',
  })
  @IsNotEmpty({ message: 'Password cannot be empty' })
  password: string;

  // Tên user
  @ApiProperty({
    example: 'John Doe',
    description: 'The name of the user',
  })
  @IsNotEmpty({ message: 'Name cannot be empty' })
  name: string;

  // Tuổi
  @ApiProperty({
    example: 30,
    description: 'The age of the user',
  })
  @IsOptional()
  age?: number;

  // Giới tính
  @ApiProperty({
    example: 'male',
    description: 'The gender of the user',
  })
  @IsOptional()
  gender?: string;

  // Địa chỉ
  @ApiProperty({
    example: 'Ha Noi',
    description: 'The address of the user',
  })
  @IsOptional()
  address?: string;

  // Vai trò của user
  @ApiProperty({
    example: 'USER',
    description: 'The role of the user',
    enum: Role,
  })
  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  // Thông tin công ty
  @ApiProperty({
    example: {
      _id: '60d0fe4f5311236168a109ca',
      name: 'Glints',
    },
    description: 'The company of the user',
  })
  @IsOptional()

  // Kiểm tra object hợp lệ
  @IsObject()

  // Validate object lồng nhau
  @ValidateNested()

  // Chuyển kiểu dữ liệu sang Company
  @Type(() => Company)
  company?: Company;
}

// DTO dùng để tạo user cơ bản
export class CreateUserDto {

  // Email user
  @ApiProperty({
    example: 'user@example.com',
    description: 'The email of the user',
  })
  @IsEmail({}, { message: 'Invalid email format' })
  @IsNotEmpty({ message: 'Email cannot be empty' })
  email: string;

  // Mật khẩu
  @ApiProperty({
    example: 'password123',
    description: 'The password of the user',
  })
  @IsNotEmpty({ message: 'Password cannot be empty' })
  password: string;

  // Tên user
  @ApiProperty({
    example: 'John Doe',
    description: 'The name of the user',
  })
  @IsNotEmpty({ message: 'Name cannot be empty' })
  name: string;

  // Tuổi
  @ApiProperty({
    example: 30,
    description: 'The age of the user',
  })
  @IsOptional()
  age?: number;

  // Giới tính
  @ApiProperty({
    example: 'male',
    description: 'The gender of the user',
  })
  @IsOptional()
  gender?: string;

  // Địa chỉ
  @ApiProperty({
    example: '123 Main St',
    description: 'The address of the user',
  })
  @IsOptional()
  address?: string;
}