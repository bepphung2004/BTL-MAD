/**
 * AUTH SERVICE - Các hàm gọi API liên quan đến Authentication
 *
 * File này chứa tất cả API calls cho tính năng xác thực:
 * - Đăng nhập/Đăng ký
 * - Quên mật khẩu/Đổi mật khẩu
 * - Lấy thông tin profile
 * - Refresh token
 *
 * KIẾN TRÚC:
 * authService → api (axios instance) → Backend API
 *
 * ⚡ Lưu ý: File này chỉ gọi API, không xử lý logic nghiệp vụ
 * Logic nghiệp vụ nằm trong authSlice.ts
 */

import api from './api';
import { ILoginRequest, IRegisterRequest, IAuthResponse, IApiResponse, IRegisterByHrRequest } from '../types';

export const authService = {
  /**
   * @param data - {username: string, password: string}
   * @returns Promise<IApiResponse<IAuthResponse>>
   */
  async login(data: ILoginRequest): Promise<IApiResponse<IAuthResponse>> {
    const response = await api.post('/auth/login', data);
    return response.data;
  },

  /**
   * REGISTER - Đăng ký tài khoản USER
   * @param data - {name, email, password, age?, gender?, address?}
   * @returns Promise<IApiResponse<any>>
   */
  async register(data: IRegisterRequest): Promise<IApiResponse<any>> {
    const response = await api.post('/auth/register', data);
    return response.data;
  },

  /**
   * LOGOUT - Đăng xuất
   * Gọi API để invalidate token trên server
   */
  async logout(): Promise<void> {
    await api.post('/auth/logout');
  },

  /**
   * REFRESH TOKEN - Làm mới access token-
   * Gọi khi access token hết hạn
   * @param refreshToken - refresh token đã lưu trong SecureStore
   * @returns Promise với access_token mới
   */
  async refreshToken(refreshToken: string): Promise<IApiResponse<IAuthResponse>> {
    const response = await api.post('/auth/refresh', { refresh_token: refreshToken });
    return response.data;
  },

  /**
   * GET PROFILE - Lấy thông tin user hiện tại
   * Sử dụng access token trong header để xác thực
   * (Token được tự động thêm vào header bởi api interceptor)
   */
  async getProfile(): Promise<IApiResponse<any>> {
    const response = await api.get('/auth/account');
    return response.data;
  },

  /**
   * FORGOT PASSWORD - Gửi OTP qua email
   * Bước 1 của flow forgot password
   * @param email - Email của user quên mật khẩu
   */
  async forgotPassword(email: string): Promise<IApiResponse<any>> {
    const response = await api.post('/otps', { email });
    return response.data;
  },

  /**
   * VERIFY OTP - Xác thực mã OTP
   * Bước 2 của flow forgot password
   * @param email - Email của user
   * @param otp - Mã OTP nhận được qua email
   */
  async verifyOtp(email: string, otp: string): Promise<IApiResponse<any>> {
    const response = await api.post('/otps/verify-otp', { email, otp });
    return response.data;
  },

  /**
   * RESET PASSWORD - Đặt lại mật khẩu mới
   * Bước 3 của flow forgot password
   * @param token - Token nhận được sau khi verify OTP
   * @param password - Mật khẩu mới
   */
  async resetPassword(token: string, password: string): Promise<IApiResponse<any>> {
    const response = await api.post('/auth/reset-password', { token, password });
    return response.data;
  },

  /**
   * GOOGLE LOGIN - Đăng nhập bằng Google
   * @param token - Google ID token từ Google Sign-In
   */
  async googleLogin(token: string): Promise<IApiResponse<IAuthResponse>> {
    const response = await api.post('/auth/google', { token });
    return response.data;
  },

  /**
   * ----------------------------------------
   * CHANGE PASSWORD - Đổi mật khẩu (khi đã đăng nhập)
   * ----------------------------------------
   * @param currentPassword - Mật khẩu hiện tại
   * @param newPassword - Mật khẩu mới
   */
  async changePassword(currentPassword: string, newPassword: string): Promise<IApiResponse<any>> {
    const response = await api.post('/auth/change-password', { currentPassword, newPassword });
    return response.data;
  },

  /**
   * REGISTER BY HR - Đăng ký tài khoản HR (nhà tuyển dụng)
   * Yêu cầu thêm thông tin công ty
   * @param data - Thông tin user + thông tin công ty
   */
  async registerByHr(data: IRegisterByHrRequest): Promise<IApiResponse<any>> {
    const response = await api.post('/auth/hr/register', data);
    return response.data;
  }
};
