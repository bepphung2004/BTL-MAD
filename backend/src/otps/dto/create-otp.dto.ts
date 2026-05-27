// Import decorator validate dữ liệu
import { IsNotEmpty } from 'class-validator';

// DTO dùng để nhận dữ liệu tạo OTP
export class CreateOtpDto {

  // Kiểm tra email không được để trống
  @IsNotEmpty({ message: 'Email is required' })
  email: string;
}