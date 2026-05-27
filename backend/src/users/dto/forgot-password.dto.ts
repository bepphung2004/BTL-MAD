// Import decorator validate dữ liệu
import { IsEmail, IsNotEmpty } from 'class-validator';

// DTO dùng cho chức năng quên mật khẩu
export class ForgotPasswordDto {

  // Email người dùng
  @IsNotEmpty({ message: 'Email is required' })

  // Kiểm tra định dạng email hợp lệ
  @IsEmail({}, { message: 'Invalid email format' })
  email: string;
}