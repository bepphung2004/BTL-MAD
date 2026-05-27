// Interface mô tả thông tin user
export interface IUser {

  // ID của user
  _id: string;

  // Email user
  email: string;

  // Tên user
  name: string;

  // Vai trò của user
  // Giá trị: 'ADMIN' | 'HR' | 'USER'
  role: string;

  // Tuổi
  age: number;

  // Giới tính
  gender?: string;

  // Địa chỉ
  address?: string;

  // Thông tin công ty
  company?: {
    _id: string;
    name: string;
    isActive: boolean;
  },

  // Ảnh đại diện
  avatar?: string;

  // Trạng thái duyệt tài khoản HR
  isApproved?: boolean;
}