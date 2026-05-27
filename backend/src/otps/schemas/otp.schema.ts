// Import decorator và kiểu dữ liệu cho Mongoose schema
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';

// Kiểu document của OTP trong MongoDB
export type OtpDocument = HydratedDocument<Otp>;

// Schema OTP, tự động tạo createdAt và updatedAt
@Schema({ timestamps: true })
export class Otp {

  // Email nhận OTP
  @Prop({ required: true })
  email: string;

  // Mã OTP/token
  @Prop({ required: true })
  token: string;

  // Trạng thái OTP còn hiệu lực hay không
  @Prop({ default: true })
  isActive: boolean;

  // Thời gian cập nhật
  @Prop()
  updatedAt: Date;

  // Thời gian tạo
  @Prop()
  createdAt: Date;

  // Đánh dấu xóa mềm (soft delete)
  @Prop({ default: false })
  isDeleted: boolean;

  // Thời gian xóa
  @Prop()
  deletedAt: Date;

  // Thời gian hết hạn OTP (tự xóa sau 10 phút)
  @Prop({ type: Date, default: Date.now, expires: '10m' })
  expiredAt: Date;

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

// Tạo schema từ class Otp
export const OtpSchema = SchemaFactory.createForClass(Otp);