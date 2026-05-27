// Import decorator validate dữ liệu
import { IsNotEmpty, IsOptional } from "class-validator";

import { CreateUserDto } from "./create-user.dto";

// DTO dùng để đăng ký tài khoản HR
// Kế thừa toàn bộ field từ CreateUserDto
export class CreateHrDto extends CreateUserDto {

    // Role cố định là HR
    role: 'HR';

    // Tên công ty (không bắt buộc)
    @IsOptional()
    companyName?: string;

    // Mã số thuế công ty (không bắt buộc)
    @IsOptional()
    taxCode?: string;

    // Quy mô công ty (không bắt buộc)
    @IsOptional()
    companyScale?: string;
}