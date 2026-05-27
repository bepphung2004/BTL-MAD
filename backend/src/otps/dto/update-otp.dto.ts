// Import PartialType để tạo DTO cập nhật
import { PartialType } from '@nestjs/mapped-types';

import { CreateOtpDto } from './create-otp.dto';

// DTO dùng để cập nhật OTP
// Kế thừa từ CreateOtpDto nhưng tất cả field đều optional
export class UpdateOtpDto extends PartialType(CreateOtpDto) {}