// Import decorator và kiểu dữ liệu cho Mongoose schema
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

import mongoose, { HydratedDocument } from 'mongoose';

import { Role } from 'src/decorator/customize';

// Kiểu document của User trong MongoDB
export type UserDocument = HydratedDocument<User>;

// Schema User, tự động tạo createdAt và updatedAt
@Schema({ timestamps: true })
export class User {

  // Email user (duy nhất)
  @Prop({ required: true, unique: true })
  email: string;

  // Mật khẩu đã hash
  @Prop({ required: true })
  password: string;

  // Tên user
  @Prop()
  name: string;

  // Giới tính
  @Prop()
  gender: string;

  // Tuổi
  @Prop()
  age: number;

  // Địa chỉ
  @Prop()
  address: string;

  // Ảnh đại diện
  @Prop()
  avatar: string;

  // Vai trò của user
  @Prop({
    type: String,
    enum: Role,
    default: Role.USER,
  })
  role: string;

  // Refresh token dùng để tạo access token mới
  @Prop()
  refreshToken: string;

  // Thông tin công ty của user
  @Prop({ type: Object })
  company: {
    _id: mongoose.Schema.Types.ObjectId;
    name: string;
    isActive: boolean;
  };

  // Thời gian cập nhật
  @Prop()
  updatedAt: Date;

  // Thời gian tạo
  @Prop()
  createdAt: Date;

  // Đánh dấu xóa mềm
  @Prop({ default: false })
  isDeleted: boolean;

  // Trạng thái khóa tài khoản
  @Prop({ default: false })
  isLocked: boolean;

  // Thời gian khóa tài khoản
  @Prop()
  lockedAt: Date;

  // Lý do khóa tài khoản
  @Prop()
  lockedReason: string;

  // Trạng thái duyệt tài khoản HR
  @Prop({ default: true })
  isApproved: boolean;

  // Thông tin công ty đăng ký của HR
  @Prop({ type: Object })
  registrationCompany: {
    name: string;
    taxCode: string;
    scale: string;
  };

  // Thời gian xóa
  @Prop()
  deletedAt: Date;

  // Thông tin người tạo
  @Prop({ type: Object })
  createdBy: {
    _id: mongoose.Schema.Types.ObjectId;
    email: string;
  };

  // Thông tin người cập nhật
  @Prop({ type: Object })
  updatedBy: {
    _id: mongoose.Schema.Types.ObjectId;
    email: string;
  };

  // Thông tin người xóa
  @Prop({ type: Object })
  deletedBy: {
    _id: mongoose.Schema.Types.ObjectId;
    email: string;
  };
}

// Tạo schema từ class User
export const UserSchema = SchemaFactory.createForClass(User);