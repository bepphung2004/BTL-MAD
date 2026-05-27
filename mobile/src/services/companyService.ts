import api from './api';
import { IApiResponse, IPaginatedResponse, ICompany } from '../types';

export interface ICompanySearchParams {
  current?: number;
  pageSize?: number;
  name?: string;
  address?: string;
  userId?: string;
  isActive?: boolean;
}

export const companyService = {
  async getCompanies(params: ICompanySearchParams = {}): Promise<IApiResponse<IPaginatedResponse<ICompany>>> {
    const queryParams = new URLSearchParams();
    
    if (params.current) queryParams.append('current', params.current.toString());
    if (params.pageSize) queryParams.append('pageSize', params.pageSize.toString());
    if (params.name) queryParams.append('name', `/${params.name}/i`);
    if (params.address) queryParams.append('address', `/${params.address}/i`);
    if (params.userId) queryParams.append('userId', params.userId);

    const response = await api.get(`/companies?${queryParams.toString()}`);
    return response.data;
  },

  async getCompanyById(id: string): Promise<IApiResponse<ICompany>> {
    const response = await api.get(`/companies/${id}`);
    return response.data;
  },

  async followCompany(companyId: string): Promise<IApiResponse<any>> {
    const response = await api.post('/companies/follow', { companyId });
    return response.data;
  },

  async unfollowCompany(companyId: string): Promise<IApiResponse<any>> {
    const response = await api.post('/companies/unfollow', { companyId });
    return response.data;
  },

  async getFollowedCompanies(): Promise<IApiResponse<ICompany[]>> {
    const response = await api.get('/users/followed-companies');
    return response.data;
  },

  async getTopCompanies(limit: number = 10): Promise<IApiResponse<IPaginatedResponse<ICompany>>> {
    const response = await api.get(`/companies?pageSize=${limit}`);
    return response.data;
  },

  async createCompany(data: { name: string; description?: string; address?: string; logo?: string }): Promise<IApiResponse<any>> {
    const response = await api.post('/companies', data);
    return response.data;
  },

  async verifyCompany(id: string): Promise<IApiResponse<any>> {
    const response = await api.post(`/companies/verify/${id}`);
    return response.data;
  },

  async getAllCompaniesByAdmin(params: ICompanySearchParams = {}): Promise<IApiResponse<IPaginatedResponse<ICompany>>> {
    const queryParams = new URLSearchParams();
    if (params.current) queryParams.append('current', params.current.toString());
    if (params.pageSize) queryParams.append('pageSize', params.pageSize.toString());
    if (params.name) queryParams.append('name', `/${params.name}/i`);
    if (params.address) queryParams.append('address', `/${params.address}/i`);
    if (params.userId) queryParams.append('userId', params.userId);
    if (typeof params.isActive === 'boolean') queryParams.append('isActive', params.isActive.toString());

    const response = await api.get(`/companies/by-admin/all?${queryParams.toString()}`);
    return response.data;
  },

  async updateCompanyByHr(companyId: string, data: { name?: string; description?: string; address?: string; logo?: string }): Promise<IApiResponse<any>> {
    const response = await api.patch(`/companies/${companyId}`, data);
    return response.data;
  },

  // Remove HR from company
  async removeHrFromCompany(hrId: string, companyId: string): Promise<IApiResponse<any>> {
    const response = await api.post('/users/hrs/remove-from-company', { hrId, companyId });
    return response.data;
  },

  // Get company HRs
  async getCompanyHrs(companyId: string): Promise<IApiResponse<any[]>> {
    const response = await api.get(`/companies/${companyId}/hrs`);
    return response.data;
  },

  // HR creates a new company
  async createCompanyByHr(data: {
    name: string;
    description?: string;
    address?: string;
    logo?: string;
    taxCode?: string;
    scale?: string;
  }): Promise<IApiResponse<any>> {
    const response = await api.post('/companies/hr/create', data);
    return response.data;
  },

  // HR requests to join an existing company
  async requestJoinCompany(companyId: string): Promise<IApiResponse<any>> {
    const response = await api.post(`/companies/${companyId}/request-join`);
    return response.data;
  },

  // Approve HR join request
  async approveHrRequest(companyId: string, userId: string): Promise<IApiResponse<any>> {
    const response = await api.post(`/companies/${companyId}/approve-hr/${userId}`);
    return response.data;
  },

  // Reject HR join request
  async rejectHrRequest(companyId: string, userId: string): Promise<IApiResponse<any>> {
    const response = await api.post(`/companies/${companyId}/reject-hr/${userId}`);
    return response.data;
  },

  // Get pending HR requests for a company
  async getPendingHrs(companyId: string): Promise<IApiResponse<any[]>> {
    const response = await api.get(`/companies/${companyId}/pending-hrs`);
    return response.data;
  },

  // Check if current user is the company creator
  async isCompanyCreator(companyId: string): Promise<IApiResponse<boolean>> {
    const response = await api.get(`/companies/${companyId}/is-creator`);
    return response.data;
  },

  async leaveCompany(): Promise<IApiResponse<any>> {
    const response = await api.post('/users/leave-company');
    return response.data;
  },
};
