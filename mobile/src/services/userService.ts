import api from './api';
import { IApiResponse, IUser } from '../types';

/**
 * Định nghĩa cấu trúc dữ liệu (Data Transfer Object) cho yêu cầu cập nhật hồ sơ cá nhân
 * Tất cả các trường đều là tùy chọn (?) để hỗ trợ cập nhật một phần dữ liệu (Partial Update)
 */
export interface IUpdateProfileDto {
  name?: string;    // Họ và tên mới
  phone?: string;   // Số điện thoại mới
  avatar?: string;  // Đường dẫn URL ảnh đại diện mới sau khi upload thành công
  age?: number;     // Tuổi mới
  gender?: string;  // Giới tính mới
  address?: string; // Địa chỉ mới
}

/**
 * Đối tượng dịch vụ (Service) quản lý và thực thi các yêu cầu HTTP gọi API liên quan đến Người dùng (User)
 * bao gồm: Lấy thông tin cá nhân, cập nhật hồ sơ, đổi mật khẩu và tải tệp tin ảnh đại diện.
 */
export const userService = {
  
  /**
   * API gọi ngoài (api.get): Tải thông tin hồ sơ chi tiết của người dùng hiện tại đang đăng nhập
   * Yêu cầu xác thực: Đính kèm mã Bearer Access Token tự động thông qua Interceptor đầu vào
   */
  async getProfile(): Promise<IApiResponse<IUser>> {
    const response = await api.get('/users/profile');
    return response.data;
  },

  /**
   * API gọi ngoài (api.patch): Cập nhật thông tin hồ sơ cá nhân theo cấu trúc DTO truyền vào
   * Sử dụng phương thức PATCH để tối ưu hiệu năng ghi đè một phần dữ liệu thay đổi trong DB
   */
  async updateProfile(data: IUpdateProfileDto): Promise<IApiResponse<IUser>> {
    const response = await api.patch('/users/profile', data);
    return response.data;
  },

  /**
   * API gọi ngoài (api.post): Gửi yêu cầu đổi mật khẩu tài khoản trực tiếp từ thiết bị cá nhân
   * Nhận vào cặp thông số mật khẩu cũ để đối chiếu xác thực và mật khẩu mới để thiết lập lại
   */
  async changePassword(oldPassword: string, newPassword: string): Promise<IApiResponse<any>> {
    const response = await api.post('/users/change-password', { oldPassword, newPassword });
    return response.data;
  },

  /**
   * API gọi ngoài (api.post): Tải tập tin hình ảnh đại diện (Avatar) lên máy chủ lưu trữ dữ liệu
   * Cấu hình nâng cao: Thiết lập tiêu đề xử lý tệp nhị phân và tăng mốc thời gian chờ phản hồi tối đa.
   */
  async uploadAvatar(formData: FormData): Promise<IApiResponse<{ url: string }>> {
    const response = await api.post('/files/upload-image', formData, {
      // API gọi ngoài (Axios Config Headers): Khai báo định dạng truyền tải dạng Form đặc thù chuyên dụng cho việc gửi File nhị phân
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      // Giữ nguyên cấu trúc dữ liệu FormData gốc, ngăn chặn Axios tự động biên dịch sang định dạng JSON chuỗi text mặc định
      transformRequest: (data) => data,
      // Thiết lập thời gian chờ tối đa (Timeout) lên tới 60 giây (60000ms) phòng trường hợp tệp ảnh dung lượng lớn hoặc mạng nghẽn
      timeout: 60000, 
    });
    return response.data;
  },
};