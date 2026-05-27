import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// Khai báo tên các khóa (Keys) tĩnh dùng để định danh dữ liệu khi lưu trữ vào bộ nhớ
const ACCESS_TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';

// API gọi ngoài (Platform.OS): Xác định trạng thái ứng dụng có đang chạy trên môi trường Web Browser hay không
const isWeb = Platform.OS === 'web';

/**
 * Đối tượng dịch vụ (Utility Service) quản lý lưu trữ, truy xuất và xóa bỏ các mã thông báo xác thực (Tokens).
 * Cơ chế hoạt động: Tự động rẽ nhánh đa nền tảng (Cross-platform) giữa Lưu trữ an toàn mã hóa trên thiết bị di động (Mobile Native) 
 * và Lưu trữ cục bộ trên trình duyệt (Web LocalStorage).
 */
export const TokenStorage = {
  
  /**
   * Truy xuất Access Token từ bộ nhớ thiết bị
   */
  async getAccessToken(): Promise<string | null> {
    try {
      if (isWeb) {
        // Môi trường Web: Sử dụng API Web Storage tiêu chuẩn đọc dữ liệu từ localStorage
        const v = localStorage.getItem(ACCESS_TOKEN_KEY);
        return v;
      }
      // Môi trường Di động: API gọi ngoài (expo-secure-store) đọc tệp tin mã hóa bất đồng bộ an toàn từ phần cứng hệ thống (iOS Keychain / Android Keystore)
      return await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
    } catch (e) {
      return null; // Trả về null nếu xảy ra sự cố đọc bộ nhớ bảo mật
    }
  },

  /**
   * Lưu trữ hoặc cập nhật Access Token vào bộ nhớ thiết bị
   */
  async setAccessToken(token: string): Promise<void> {
    try {
      // Ép kiểu dữ liệu đảm bảo giá trị lưu trữ luôn là một chuỗi (String) thuần túy
      const value = String(token ?? '');
      if (isWeb) {
        localStorage.setItem(ACCESS_TOKEN_KEY, value);
        return;
      }
      // API gọi ngoài (expo-secure-store): Ghi dữ liệu bất đồng bộ vào phân vùng mã hóa an toàn trên Mobile
      await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, value);
    } catch (error) {
      console.error('Error saving access token:', error);
    }
  },

  /**
   * Truy xuất Refresh Token từ bộ nhớ thiết bị
   */
  async getRefreshToken(): Promise<string | null> {
    try {
      if (isWeb) {
        const v = localStorage.getItem(REFRESH_TOKEN_KEY);
        return v;
      }
      return await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
    } catch (e) {
      return null;
    }
  },

  /**
   * Lưu trữ hoặc cập nhật Refresh Token vào bộ nhớ thiết bị
   */
  async setRefreshToken(token: string): Promise<void> {
    try {
      const value = String(token ?? '');
      if (isWeb) {
        localStorage.setItem(REFRESH_TOKEN_KEY, value);
        return;
      }
      await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, value);
    } catch (error) {
      console.error('Error saving refresh token:', error);
    }
  },

  /**
   * API nội bộ lồng nhau: Đồng thời lưu trữ cả cặp Access Token và Refresh Token vào hệ thống
   * Thường được kích hoạt gọi khi xử lý Đăng nhập thành công hoặc sau khi làm mới Token tự động (Refresh Token thành công)
   */
  async setTokens(accessToken: string, refreshToken: string): Promise<void> {
    await this.setAccessToken(accessToken);
    // Chỉ tiến hành cập nhật Refresh Token mới nếu tham số truyền vào hợp lệ không rỗng
    if (refreshToken) {
      await this.setRefreshToken(refreshToken);
    }
  },

  /**
   * Xóa sạch toàn bộ cặp token khỏi bộ nhớ thiết bị
   * Thường được kích hoạt gọi khi xử lý Đăng xuất (Logout) hoặc khi phiên làm việc hết hạn hoàn toàn (Refresh Token thất bại)
   */
  async clearTokens(): Promise<void> {
    try {
      if (isWeb) {
        // Loại bỏ hoàn toàn các khóa đăng ký khỏi bộ nhớ trình duyệt
        localStorage.removeItem(ACCESS_TOKEN_KEY);
        localStorage.removeItem(REFRESH_TOKEN_KEY);
        return;
      }
      // API gọi ngoài (expo-secure-store): Xóa bỏ tận gốc tệp bản ghi mã hóa bất đồng bộ trên phân vùng di động
      await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
      await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
    } catch (error) {
      console.error('Error clearing tokens:', error);
    }
  },
};