import api from './api';
import { IApiResponse, IPaginatedResponse, IJob } from '../types';

/**
 * Định nghĩa cấu trúc các tham số đầu vào phục vụ cho việc tìm kiếm, lọc và phân trang Công việc (Job)
 */
export interface IJobSearchParams {
  current?: number;   // Trang hiện tại cần lấy dữ liệu (Phục vụ phân trang)
  pageSize?: number;  // Số lượng bản ghi tối đa trên một trang
  name?: string;      // Từ khóa tìm kiếm theo tên công việc
  location?: string;  // Từ khóa tìm kiếm theo địa điểm làm việc
  level?: string;     // Cấp bậc công việc (Intern, Junior, Senior,...)
  salary?: any;       // Khoảng lương: Có thể là một số hoặc object chứa các toán tử so sánh logic ($gte, $lte, $lt)
  skills?: any;       // Danh sách kỹ năng: Mảng chuỗi hoặc object chứa toán tử $in của MongoDB
  companyId?: string; // Mã định danh của công ty đăng tuyển
}

/**
 * Đối tượng dịch vụ (Service) quản lý và thực thi toàn bộ các yêu cầu gọi API liên quan đến Công việc (Job)
 */
export const jobService = {
  
  /**
   * API gọi ngoài (api.get): Lấy danh sách công việc kèm theo bộ lọc tìm kiếm nâng cao nâng cao và phân trang
   */
  async getJobs(params: IJobSearchParams = {}): Promise<IApiResponse<IPaginatedResponse<IJob>>> {
    // Khởi tạo đối tượng URLSearchParams để tự động mã hóa và xây dựng Query String chuẩn HTTP
    const queryParams = new URLSearchParams();
    
    // Đóng gói các tham số phân trang cơ bản
    if (params.current) queryParams.append('current', params.current.toString());
    if (params.pageSize) queryParams.append('pageSize', params.pageSize.toString());
    
    // XỬ LÝ SEARCH DẠNG REGEX: Đóng gói từ khóa vào cấu trúc RegExp mẫu /keyword/i (Không phân biệt hoa thường)
    // cấu trúc này giúp tương thích trực tiếp với thư viện api-query-params của Backend NestJS
    if (params.name) queryParams.append('name', `/${params.name}/i`);
    if (params.location) queryParams.append('location', `/${params.location}/i`);
    if (params.level) queryParams.append('level', params.level);
    if (params.companyId) queryParams.append('company', params.companyId);
    
    // LỌC THEO SKILLS: Biến mảng kỹ năng [React, Node] thành chuỗi Regex Pattern dạng "React|Node"
    // Giúp tìm kiếm các Job chỉ cần chứa một trong số các kỹ năng yêu cầu tuyển dụng
    if (params.skills && Array.isArray(params.skills) && params.skills.length > 0) {
      const skillsPattern = params.skills.join('|');
      queryParams.append('skills', `/${skillsPattern}/i`);
    }
    
    // Sinh chuỗi Query String cơ sở ban đầu từ URLSearchParams
    let queryString = queryParams.toString();
    
    // XỬ LÝ LỌC LƯƠNG ĐẶC THÙ (BẰNG TAY): URLSearchParams mặc định sẽ tự động mã hóa các ký tự ngoặc vuông [ ]
    // biến đổi salary[gte] thành dạng %5Bgte%5D làm hỏng cú pháp phân tích của thư viện api-query-params.
    // Do đó, cần tiến hành nối chuỗi thủ công để giữ nguyên ký tự ngoặc gốc gửi lên Server.
    if (params.salary && typeof params.salary === 'object') {
      // Trường hợp lương nhỏ hơn mốc quy định ($lt)
      if (params.salary.$lt) {
        queryString += `&salary[lt]=${params.salary.$lt}`;
      }
      // Trường hợp lọc lương nằm trong khoảng giá trị (Từ $gte đến $lte)
      if (params.salary.$gte && params.salary.$lte) {
        queryString += `&salary[gte]=${params.salary.$gte}&salary[lte]=${params.salary.$lte}`;
      } else if (params.salary.$gte) {
        // Chỉ lọc mốc lương tối thiểu lớn hơn hoặc bằng ($gte)
        queryString += `&salary[gte]=${params.salary.$gte}`;
      }
    }

    // Thực hiện lệnh gọi HTTP Get Request tới endpoint lấy danh sách việc làm công khai
    const response = await api.get(`/jobs?${queryString}`);
    return response.data;
  },

  /**
   * API gọi ngoài (api.get): Tải chi tiết thông tin của 1 Công việc dựa theo mã định danh (id)
   */
  async getJobById(id: string): Promise<IApiResponse<IJob>> {
    const response = await api.get(`/jobs/${id}`);
    return response.data;
  },

  /**
   * API gọi ngoài (api.get): Lấy danh sách việc làm thuộc về một công ty cụ thể kèm phân trang
   */
  async getJobsByCompany(companyId: string, params: IJobSearchParams = {}): Promise<IApiResponse<IPaginatedResponse<IJob>>> {
    const queryParams = new URLSearchParams();
    queryParams.append('companyId', companyId);
    if (params.current) queryParams.append('current', params.current.toString());
    if (params.pageSize) queryParams.append('pageSize', params.pageSize.toString());

    const response = await api.get(`/jobs?${queryParams.toString()}`);
    return response.data;
  },

  /**
   * API gọi ngoài (api.get): Lấy danh sách các việc làm mới nhất (Top Jobs) hiển thị ở trang chủ ứng dụng
   */
  async getTopJobs(limit: number = 10): Promise<IApiResponse<IPaginatedResponse<IJob>>> {
    // Gửi tham số sort=-createdAt để yêu cầu Mongoose sắp xếp bản ghi mới tạo lên trước
    const response = await api.get(`/jobs?pageSize=${limit}&sort=-createdAt`);
    return response.data;
  },

  /**
   * API gọi ngoài (api.get): Lấy toàn bộ danh sách công việc do chính Nhà tuyển dụng (HR) hiện tại tạo ra
   */
  async getJobsByHr(params: IJobSearchParams = {}): Promise<IApiResponse<IPaginatedResponse<IJob>>> {
    const queryParams = new URLSearchParams();
    
    if (params.current) queryParams.append('current', params.current.toString());
    if (params.pageSize) queryParams.append('pageSize', params.pageSize.toString());
    if (params.name) queryParams.append('name', `/${params.name}/i`);
    if (params.location) queryParams.append('location', `/${params.location}/i`);
    if (params.level) queryParams.append('level', params.level);

    // Endpoint riêng biệt nội bộ yêu cầu xác thực JWT qua Token để trích xuất danh sách của riêng HR đó
    const response = await api.get(`/jobs/by-hr/all?${queryParams.toString()}`);
    return response.data;
  },

  /**
   * API gọi ngoài (api.get): Tìm kiếm việc làm trong danh mục quản lý riêng của HR dựa theo từ khóa tên
   */
  async searchJobsByHr(name: string, params: IJobSearchParams = {}): Promise<IApiResponse<IPaginatedResponse<IJob>>> {
    const queryParams = new URLSearchParams();
    
    if (name) queryParams.append('name', name);
    if (params.current) queryParams.append('current', params.current.toString());
    if (params.pageSize) queryParams.append('pageSize', params.pageSize.toString());

    const response = await api.get(`/jobs/by-hr/search?${queryParams.toString()}`);
    return response.data;
  },

  /**
   * API gọi ngoài (api.post): Gửi yêu cầu đăng tin tuyển dụng tạo mới một Công việc (Yêu cầu quyền HR)
   */
  async createJob(data: IJob): Promise<IApiResponse<IJob>> {
    const response = await api.post('/jobs', data);
    return response.data;
  },

  /**
   * API gọi ngoài (api.patch): Gập nhật một hoặc một vài thông số chỉnh sửa của Job dựa theo ID công việc
   */
  async updateJob(id: string, data: Partial<IJob>): Promise<IApiResponse<any>> {
    const response = await api.patch(`/jobs/${id}`, data);
    return response.data;
  },

  /**
   * API gọi ngoài (api.delete): Thực hiện xóa bỏ công việc khỏi hệ thống (Thường là xóa mềm ẩn bản ghi)
   */
  async deleteJob(id: string): Promise<IApiResponse<any>> {
    const response = await api.delete(`/jobs/${id}`);
    return response.data;
  },
};