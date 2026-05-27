import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { IJob, IPaginatedResponse, IMeta } from '../../types';
import { jobService, IJobSearchParams } from '../../services/jobService';

/**
 * Định nghĩa cấu trúc State lưu trữ trong Store của phân vùng Công việc (Jobs)
 */
export interface JobState {
  jobs: IJob[];              // Danh sách công việc phục vụ hiển thị chính
  topJobs: IJob[];           // Danh sách các công việc nổi bật/mới nhất ở trang chủ
  currentJob: IJob | null;   // Dữ liệu chi tiết của công việc đang xem
  meta: IMeta | null;        // Thông tin cấu trúc meta phân trang gốc từ Server
  pagination: {              // Dữ liệu phân trang đã được chuẩn hóa gọn cho Client
    current: number;
    pageSize: number;
    pages: number;
    total: number;
  } | null;
  isLoading: boolean;        // Trạng thái chờ khi gọi các API liên quan đến Job
  error: string | null;      // Lưu văn bản thông báo lỗi từ Server nếu tác vụ thất bại
  searchParams: IJobSearchParams; // Lưu trữ bộ lọc tìm kiếm hiện tại để đồng bộ khi chuyển trang
}

// Khởi tạo giá trị mặc định ban đầu cho Job State khi ứng dụng vừa khởi chạy
const initialState: JobState = {
  jobs: [],
  topJobs: [],
  currentJob: null,
  meta: null,
  pagination: null,
  isLoading: false,
  error: null,
  searchParams: {
    current: 1,
    pageSize: 10,
  },
};

/**
 * ASYNC THUNK: Tải danh sách công việc bất đồng bộ kèm bộ lọc tìm kiếm nâng cao
 */
export const fetchJobs = createAsyncThunk(
  'jobs/fetchJobs',
  async (params: IJobSearchParams, { rejectWithValue }) => {
    try {
      // API gọi ngoài (jobService): Gửi tham số tìm kiếm lên Server để lấy danh sách việc làm phân trang
      const response = await jobService.getJobs(params);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Lấy danh sách công việc thất bại');
    }
  }
);

/**
 * ASYNC THUNK: Tải chi tiết thông tin của 1 Công việc dựa theo mã ID
 */
export const fetchJobById = createAsyncThunk(
  'jobs/fetchJobById',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await jobService.getJobById(id);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Lấy chi tiết công việc thất bại');
    }
  }
);

/**
 * ASYNC THUNK: Tải danh sách các công việc nổi bật hàng đầu (Top Jobs) hiển thị ở màn hình chính
 */
export const fetchTopJobs = createAsyncThunk(
  'jobs/fetchTopJobs',
  async (limit: number = 10, { rejectWithValue }) => {
    try {
      const response = await jobService.getTopJobs(limit);
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Lấy công việc nổi bật thất bại');
    }
  }
);

/**
 * Cấu hình Job Slice chịu trách nhiệm kết hợp tạo Actions và Reducers xử lý dữ liệu Công việc
 */
const jobSlice = createSlice({
  name: 'jobs',
  initialState,
  
  // REDUCERS: Nơi xử lý các Action đồng bộ (Synchronous) nội bộ ngay tại Client
  reducers: {
    // Cập nhật hoặc lưu vết bộ lọc tìm kiếm mới do người dùng cấu hình trên UI
    setSearchParams: (state, action) => {
      state.searchParams = { ...state.searchParams, ...action.payload };
    },
    // Khôi phục bộ lọc tìm kiếm về trạng thái mặc định (Trang 1, 10 bản ghi)
    clearSearchParams: (state) => {
      state.searchParams = { current: 1, pageSize: 10 };
    },
    // Xóa sạch dữ liệu công việc hiện tại (Thường gọi khi người dùng thoát màn hình chi tiết)
    clearCurrentJob: (state) => {
      state.currentJob = null;
    },
  },
  
  // EXTRA REDUCERS: Nơi lắng nghe và cập nhật trạng thái của các tác vụ bất đồng bộ (Async Thunk) ngoài Slice
  extraReducers: (builder) => {
    builder
      // --- XỬ LÝ LUỒNG LẤY DANH SÁCH JOB (FETCH JOBS) ---
      .addCase(fetchJobs.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchJobs.fulfilled, (state, action) => {
        state.isLoading = false;
        const incoming = action.payload.result || [];
        const meta = action.payload.meta || { current: 1, pageSize: incoming.length, pages: 1, total: incoming.length };
        
        // KỸ THUẬT LỌC VÀ TRỘN MẢNG (INFINITE SCROLL LOGIC):
        // Nếu trang hiện tại lớn hơn 1 (Ứng viên đang cuộn tải thêm trang tiếp theo)
        if (meta.current && meta.current > 1) {
          // Khởi tạo một đối tượng Set lưu danh sách các _id hiện có trong Store để tối ưu thời gian tra cứu O(1)
          const existingIds = new Set(state.jobs.map((j) => j._id));
          // Thực hiện lọc mảng mới từ server về, chỉ lấy những Job chưa từng tồn tại trong Store
          const toAppend = incoming.filter((j) => !existingIds.has(j._id));
          // Tiến hành nối thêm (Append) danh sách mới vào sau danh sách cũ trong Store
          state.jobs = [...state.jobs, ...toAppend];
        } else {
          // Nếu quay về trang 1 (Người dùng thực hiện Refresh / Đổi bộ lọc tìm kiếm mới) -> Thay thế hoàn toàn danh sách cũ
          state.jobs = incoming;
        }
        
        // Đồng bộ dữ liệu phân trang nhận từ server về Store
        state.meta = meta;
        state.pagination = {
          current: meta.current,
          pageSize: meta.pageSize,
          pages: meta.pages,
          total: meta.total,
        };
      })
      .addCase(fetchJobs.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      
      // --- XỬ LÝ LUỒNG LẤY CHI TIẾT JOB (FETCH JOB BY ID) ---
      .addCase(fetchJobById.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchJobById.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentJob = action.payload; // Nạp dữ liệu chi tiết công việc vào Store phục vụ UI hiển thị
      })
      .addCase(fetchJobById.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      
      // --- XỬ LÝ LUỒNG LẤY TOP JOBS (FETCH TOP JOBS) ---
      .addCase(fetchTopJobs.fulfilled, (state, action) => {
        state.topJobs = action.payload.result; // Lưu danh sách việc làm nổi bật riêng biệt
      });
  },
});

// Xuất bản (Export) các Actions đồng bộ để sử dụng trong UI components qua useDispatch
export const { setSearchParams, clearSearchParams, clearCurrentJob } = jobSlice.actions;

// Xuất bản bộ xử lý giảm thiểu (Reducer) chính để cấu hình vào Store tổng của ứng dụng
export default jobSlice.reducer;