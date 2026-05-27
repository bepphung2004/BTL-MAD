import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { IRegisterByHrRequest, IUser } from '../../types';
import { authService } from '../../services/authService';
import { TokenStorage } from '../../utils/tokenStorage';

/**
 * Định nghĩa cấu trúc State lưu trữ trong Store của phân vùng Xác thực (Auth)
 */
interface AuthState {
  user: IUser | null;          // Thông tin chi tiết của người dùng đang đăng nhập (null nếu chưa login)
  isAuthenticated: boolean;    // Cờ trạng thái: true = đã đăng nhập thành công, false = ngược lại
  isLoading: boolean;          // Trạng thái chờ khi gọi các API Login/Xác thực Profile
  isRegisterLoading: boolean;  // Trạng thái chờ riêng khi gọi các API Đăng ký tài khoản (User/HR)
  error: string | null;        // Lưu văn bản thông báo lỗi từ Server phản hồi khi tác vụ thất bại
}

// Khởi tạo giá trị mặc định ban đầu cho Auth State khi ứng dụng vừa khởi chạy
const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: false,
  isRegisterLoading: false,
  error: null,
};

/**
 * ASYNC THUNK: Tác vụ Đăng nhập tài khoản bất đồng bộ
 * Thực hiện: Gọi API xác thực -> Lưu cặp Tokens vào phân vùng mã hóa an toàn -> Trả về dữ liệu User
 */
export const login = createAsyncThunk(
  'auth/login', // Tên định danh của Action (Action type)
  async (
    { username, password }: { username: string; password: string },
    { rejectWithValue } // API gọi ngoài (Redux): Dùng để đóng gói và trả về lỗi tùy biến nếu API thất bại
  ) => {
    try {
      // BƯỚC 1: Gọi API kết nối kiểm tra tài khoản mật khẩu
      const response = await authService.login({ username, password });

      // BƯỚC 2: Bóc tách dữ liệu phản hồi từ máy chủ
      const { access_token, refresh_token, user } = response.data;

      // BƯỚC 3: API gọi ngoài (TokenStorage): Lưu trữ an toàn các mã thông báo vào thiết bị
      if (access_token) {
        await TokenStorage.setAccessToken(String(access_token));
      }
      if (refresh_token) {
        await TokenStorage.setRefreshToken(String(refresh_token));
      }

      // Trả dữ liệu user về để nạp vào payload của trường hợp fulfilled
      return user;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Đăng nhập thất bại');
    }
  }
);

/**
 * ASYNC THUNK: Đăng ký tài khoản cho Ứng viên (USER) thông thường
 */
export const register = createAsyncThunk(
  'auth/register',
  async (
    data: { name: string; email: string; password: string; age?: number; gender?: string; address?: string },
    { rejectWithValue }
  ) => {
    try {
      const response = await authService.register(data);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Đăng ký thất bại');
    }
  }
);

/**
 * ASYNC THUNK: Đăng ký tài khoản đặc quyền dành riêng cho Nhà tuyển dụng (HR)
 */
export const registerByHr = createAsyncThunk(
  'auth/registerByHr',
  async (data: IRegisterByHrRequest, { rejectWithValue }) => {
    try {
      const response = await authService.registerByHr(data);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Đăng ký thất bại');
    }
  }
);

/**
 * ASYNC THUNK: Đăng xuất tài khoản khỏi hệ thống
 * Thực hiện: Gọi API hủy phiên ở Server -> Xóa sạch Tokens lưu vết ở cục bộ thiết bị
 */
export const logout = createAsyncThunk(
  'auth/logout',
  async (_, { rejectWithValue }) => {
    try {
      await authService.logout();
      await TokenStorage.clearTokens(); // API gọi ngoài (TokenStorage): Xóa tokens trong máy
    } catch (error: any) {
      // Biện pháp phòng vệ: Dù API Server lỗi vẫn tiến hành xóa sạch tokens local để bảo mật tài khoản
      await TokenStorage.clearTokens();
      return rejectWithValue(error.response?.data?.message || 'Đăng xuất thất bại');
    }
  }
);

/**
 * ASYNC THUNK: Đồng bộ/Tải lại dữ liệu hồ sơ cá nhân mới nhất từ máy chủ
 */
export const getProfile = createAsyncThunk(
  'auth/getProfile',
  async (_, { rejectWithValue }) => {
    try {
      const response = await authService.getProfile();
      return response.data.user; // Trả về thông tin user đã cập nhật
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Lấy thông tin thất bại');
    }
  }
);

/**
 * ASYNC THUNK: Kiểm tra và phục hồi trạng thái đăng nhập (Auto-Login) khi người dùng vừa bật app
 */
export const checkAuth = createAsyncThunk(
  'auth/checkAuth',
  async (_, { rejectWithValue }) => {
    try {
      // BƯỚC 1: Đọc Access Token cũ từ bộ nhớ an toàn trong máy
      const token = await TokenStorage.getAccessToken();

      // BƯỚC 2: Nếu máy hoàn toàn trống token -> Coi như chưa từng đăng nhập
      if (!token) {
        throw new Error('No token');
      }

      // BƯỚC 3: API gọi ngoài (authService): Gửi Token lên Server để kiểm tra tính hợp lệ và lấy lại profile
      const response = await authService.getProfile();
      return response.data.user;
    } catch (error: any) {
      // Nếu Token đã hết hạn hoặc không hợp lệ -> Xóa sạch dấu vết để tránh lỗi vòng lặp
      await TokenStorage.clearTokens();
      return rejectWithValue('Phiên đăng nhập hết hạn');
    }
  }
);

/**
 * Cấu hình Auth Slice chịu trách nhiệm kết hợp tạo Actions và Reducers xử lý dữ liệu Xác thực
 */
const authSlice = createSlice({
  name: 'auth',
  initialState,

  // REDUCERS: Nơi xử lý các Action đồng bộ (Synchronous) nội bộ ngay tại Client
  reducers: {
    // Xóa thông điệp lỗi cũ trên giao diện
    clearError: (state) => {
      state.error = null;
    },
    
    // API nội bộ: Ép thiết lập thủ công thông tin người dùng (Phục vụ cập nhật nhanh)
    setUser: (state, action: PayloadAction<IUser>) => {
      state.user = action.payload;
      state.isAuthenticated = true;
    },

    // Reset trạng thái xác thực về rỗng (Xóa sạch bộ nhớ tạm)
    clearAuth: (state) => {
      state.user = null;
      state.isAuthenticated = false;
      state.error = null;
    },
  },

  // EXTRA REDUCERS: Nơi lắng nghe và xử lý trạng thái của các tác vụ bất đồng bộ (Async Thunk) ngoài Slice
  extraReducers: (builder) => {
    builder
      
      // --- XỬ LÝ LUỒNG ĐĂNG NHẬP (LOGIN) ---
      .addCase(login.pending, (state) => {
        state.isLoading = true;   // Kích hoạt bật spinner loading trên giao diện
        state.error = null;       // Đập tan thông báo lỗi cũ
      })
      .addCase(login.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload;        // Lưu thông tin cấu trúc User nhận từ Thunk về Store
        state.isAuthenticated = true;       // Kích hoạt cờ true -> Khiến hệ thống AppNavigator tự động nhảy vào cụm MainTabs
      })
      .addCase(login.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string; // Ghi nhận text thông báo lỗi để hiển thị lên Alert UI
      })

      // --- XỬ LÝ LUỒNG ĐĂNG KÝ ỨNG VIÊN (REGISTER) ---
      .addCase(register.pending, (state) => {
        state.isRegisterLoading = true;
        state.error = null;
      })
      .addCase(register.fulfilled, (state) => {
        state.isRegisterLoading = false;
        // Quy tắc nghiệp vụ: Đăng ký xong không tự login, bắt buộc quay lại màn Login để nhập tài khoản bằng tay
      })
      .addCase(register.rejected, (state, action) => {
        state.isRegisterLoading = false;
        state.error = action.payload as string;
      })

      // --- XỬ LÝ LUỒNG ĐĂNG KÝ NHÀ TUYỂN DỤNG (REGISTER BY HR) ---
      .addCase(registerByHr.pending, (state) => {
        state.isRegisterLoading = true;
        state.error = null;
      })
      .addCase(registerByHr.fulfilled, (state) => {
        state.isRegisterLoading = false; // Xử lý tương tự register thông thường, chờ quản trị viên duyệt tài khoản
      })
      .addCase(registerByHr.rejected, (state, action) => {
        state.isRegisterLoading = false;
        state.error = action.payload as string;
      })

      // --- XỬ LÝ LUỒNG ĐĂNG XUẤT (LOGOUT) ---
      .addCase(logout.fulfilled, (state) => {
        // Trả toàn bộ trạng thái xác thực về mốc xuất phát ban đầu
        state.user = null;
        state.isAuthenticated = false;  // Kích hoạt cờ false -> Ép AppNavigator đá người dùng văng ra màn LoginScreen
      })

      // --- XỬ LÝ LUỒNG ĐỒNG BỘ HỒ SƠ (GET PROFILE) ---
      .addCase(getProfile.fulfilled, (state, action) => {
        state.user = action.payload;    // Cập nhật thông tin chi tiết mới tinh của user (avatar, tên, tuổi,...) vào Store
        state.isAuthenticated = true;
      })

      // --- XỬ LÝ LUỒNG TỰ ĐỘNG KHÔI PHỤC PHIÊN (CHECK AUTHk) ---
      .addCase(checkAuth.pending, (state) => {
        state.isLoading = true; // Bật màn hình Splash Chờ kiểm tra trạng thái token khi vừa khởi động app
      })
      .addCase(checkAuth.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload;
        state.isAuthenticated = true;   // Token hợp lệ -> Giữ nguyên trạng thái đăng nhập đi thẳng vào trong App
      })
      .addCase(checkAuth.rejected, (state) => {
        state.isLoading = false;
        state.user = null;
        state.isAuthenticated = false;  // Token hỏng/Hết hạn hoàn toàn -> Ép định tuyến ra ngoài màn Đăng nhập
      });
  },
});

// Xuất bản (Export) các Actions đồng bộ xử lý cục bộ
export const { clearError, setUser, clearAuth } = authSlice.actions;

// Xuất bản bộ xử lý giảm thiểu (Reducer) chính để đăng ký vào cấu trúc Store tổng của ứng dụng
export default authSlice.reducer;