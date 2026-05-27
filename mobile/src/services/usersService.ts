import api from './api';
import { IApiResponse, IPaginatedResponse, IUser, IUserCV } from '../types';

export const usersService = {
  async getUsers(): Promise<IApiResponse<IPaginatedResponse<IUser>>> {
    const response = await api.get('/users');
    return response.data;
  },

  async getCandidates(): Promise<IApiResponse<IPaginatedResponse<IUser>>> {
    const response = await api.get('/users/admin/candidates');
    return response.data;
  },

  async getUserById(id: string): Promise<IApiResponse<IUser>> {
    const response = await api.get(`/users/${id}`);
    return response.data;
  },

  async getUserCVs(userId: string): Promise<IApiResponse<IUserCV[]>> {
    const response = await api.get(`/user-cvs/admin/user/${userId}`);
    return response.data;
  },

  async createUser(data: Partial<IUser>): Promise<IApiResponse<IUser>> {
    const response = await api.post('/users', data);
    return response.data;
  },

  async updateUser(id: string, data: Partial<IUser>): Promise<IApiResponse<IUser>> {
    const response = await api.patch(`/users/${id}`, data);
    return response.data;
  },

  async deleteUser(id: string): Promise<IApiResponse<any>> {
    const response = await api.delete(`/users/${id}`);
    return response.data;
  },

  async lockUser(userId: string, reason?: string): Promise<IApiResponse<any>> {
    const response = await api.post(`/users/${userId}/lock`, { reason });
    return response.data;
  },

  async unlockUser(userId: string): Promise<IApiResponse<any>> {
    const response = await api.post(`/users/${userId}/unlock`);
    return response.data;
  },

  async getPendingHrs(): Promise<IApiResponse<IUser[]>> {
    const response = await api.get('/users/admin/pending-hrs');
    return response.data;
  },

  async approveHr(userId: string): Promise<IApiResponse<any>> {
    const response = await api.post(`/users/${userId}/approve-hr`);
    return response.data;
  },
};

export default usersService;
