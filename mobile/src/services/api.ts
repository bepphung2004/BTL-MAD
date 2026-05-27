import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { API_URL } from '../constants';
import { TokenStorage } from '../utils/tokenStorage';

/**
 * Định nghĩa cấu trúc cho một phần tử nằm trong hàng đợi các Request bị lỗi 401
 * Chờ đợi được kích hoạt (Resolve/Reject) sau khi tiến trình làm mới Token hoàn tất
 */
interface QueueItem {
  resolve: (token: string) => void; // Hàm callback được gọi khi làm mới Token thành công
  reject: (error: any) => void;     // Hàm callback được gọi khi làm mới Token thất bại
}

// Biến cờ (Flag) đánh dấu hệ thống có đang trong tiến trình gửi API làm mới Token hay không
let isRefreshing = false;

// Mảng lưu trữ hàng đợi các Requests bị tạm dừng do lỗi hết hạn Access Token (401)
let failedQueue: QueueItem[] = [];

/**
 * Hàm giải phóng hàng đợi: Duyệt qua tất cả các Request đang bị nghẽn để thực thi lại 
 * hoặc hủy bỏ tùy thuộc vào kết quả của tiến trình Refresh Token
 */
const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (token) {
      // Nếu có token mới -> Kích hoạt resolve để đính kèm token và tái gửi request
      prom.resolve(token);
    } else {
      // Nếu làm mới thất bại -> Kích hoạt reject để ném lỗi ra ngoài cho phía UI xử lý
    }
  });
  // Xóa rỗng hàng đợi sau khi đã xử lý xong
  failedQueue = [];
};

/**
 * API gọi ngoài (Axios Instance): Tạo cấu hình mạng cơ sở cho toàn bộ hệ thống Client
 */
const api = axios.create({
  baseURL: API_URL,      // Cấu hình URL gốc của máy chủ API Backend
  timeout: 30000,        // Giới hạn thời gian tối đa cho 1 request là 30 giây (Timeout)
  headers: {
    'Content-Type': 'application/json', // Định dạng dữ liệu truyền tải mặc định là JSON
  },
});

/**
 * REQUEST INTERCEPTOR: Bộ chặn đầu vào - Tự động can thiệp trước khi Request được gửi đi
 * Nhiệm vụ: Đính kèm Access Token vào Header Authorization nếu tồn tại trong bộ nhớ máy
 */
api.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    // API gọi ngoài (TokenStorage): Lấy mã token truy cập hiện tại từ thiết bị lưu trữ
    const token = await TokenStorage.getAccessToken();
    if (token && config.headers) {
      // Đính kèm Token theo chuẩn định dạng chuỗi Bearer Token
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error) // Ném lỗi nếu cấu hình request gặp sự cố nội bộ trước khi gửi
);

/**
 * RESPONSE INTERCEPTOR: Bộ chặn đầu ra - Can thiệp ngay khi nhận được phản hồi từ Server
 * Nhiệm vụ: Xử lý tập trung lỗi hết hạn mã thông báo (401 Unauthorized) và thiết lập tự động Refresh Token
 */
api.interceptors.response.use(
  (response) => response, // Nếu phản hồi thành công (Status 2xx), cho phép dữ liệu đi qua bình thường
  async (error: AxiosError) => {
    // Ép kiểu mở rộng cấu trúc config gốc của request lỗi để đính kèm thuộc tính tùy biến '_retry'
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    // Kiểm tra: Nếu Server trả về mã lỗi 401 và Request này chưa từng được kích hoạt thử lại lần nào (_retry !== true)
    if (error.response?.status === 401 && !originalRequest._retry) {
      
      // TRƯỜNG HỢP 1: Hệ thống ĐANG có một tiến trình làm mới token khác đang chạy ngầm
      if (isRefreshing) {
        // Trả về một Promise treo lơ lửng và đẩy hàm điều khiển của Request hiện tại vào hàng đợi (failedQueue)
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            // Sau khi tiến trình gốc refresh thành công, nhận token mới, cập nhật lại Header Authorization
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${token}`;
            }
            // Kích hoạt thực thi lại chính request gốc này bằng Axios instance
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      // TRƯỜNG HỢP 2: Request hiện tại là request ĐẦU TIÊN phát hiện lỗi 401, đứng ra chịu trách nhiệm gọi API Refresh
      originalRequest._retry = true; // Bật cờ đánh dấu request này đã được kích hoạt cứu vãn, không lặp lại vô hạn
      isRefreshing = true;           // Khóa cờ hệ thống để các request lỗi 401 đến sau đi vào hàng đợi nghẽn ở trên

      try {
        // API gọi ngoài (TokenStorage): Lấy mã token làm mới từ kho lưu trữ thiết bị
        const refreshToken = await TokenStorage.getRefreshToken();
        
        if (!refreshToken) {
          throw new Error('No refresh token');
        }

        // API gọi ngoài (Axios thuần): Gửi yêu cầu POST độc lập tới endpoint gia hạn token của máy chủ
        // Lưu ý: Phải dùng instance axios gốc, không dùng 'api' tránh bị đính kèm interceptor lặp lại lỗi vòng tròn
        const response = await axios.post(`${API_URL}/auth/refresh`, {
          refresh_token: refreshToken,
        });

        // Bóc tách cặp Access Token và Refresh Token mới từ cấu trúc dữ liệu trả về của Backend
        const { access_token, refresh_token } = response.data.data;

        // Lưu trữ cặp token mới cập nhật vào bộ nhớ thiết bị di động/trình duyệt
        await TokenStorage.setTokens(access_token, refresh_token);

        // Giải phóng hàng đợi: Kích hoạt chạy lại toàn bộ các request đang xếp hàng chờ bằng token mới nhận được
        processQueue(null, access_token);

        // Cập nhật lại token mới vào cho chính request đầu tiên này
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${access_token}`;
        }

        // Tái thực thi gửi lại request đầu tiên này và trả kết quả về cho luồng code nghiệp vụ gọi ban đầu
        return api(originalRequest);
      } catch (refreshError) {
        // BIỆN PHÁP XỬ LÝ KHI REFRESH TOKEN CŨNG BỊ LỖI (Hết hạn cả Refresh Token / Token không hợp lệ)
        processQueue(refreshError, null); // Hủy bỏ và ném lỗi toàn bộ danh sách request đang chờ trong hàng đợi
        await TokenStorage.clearTokens(); // Xóa sạch dữ liệu token lưu trữ để bảo mật thông tin
        
        // MẸO HỆ THỐNG: Có thể phát một sự kiện (Event/Dispatch logout) tại đây để bắt UI ép người dùng về trang Đăng nhập
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false; // Mở khóa cờ hệ thống để sẵn sàng cho các tiến trình kiểm tra sau này
      }
    }

    // Nếu không phải lỗi 401 hoặc request đã thử lại rồi mà vẫn lỗi -> Ném lỗi ra cho tầng service/UI xử lý
    return Promise.reject(error);
  }
);

export default api;