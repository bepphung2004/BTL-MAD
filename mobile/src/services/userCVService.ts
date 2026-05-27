import api from './api';
import { IApiResponse, IUserCV } from '../types';

export const userCVService = {
  async getMyCVs(): Promise<IApiResponse<IUserCV[]>> {
    const response = await api.get('/user-cvs');
    return response.data;
  },

  async getCVsForApplication(): Promise<IApiResponse<IUserCV[]>> {
    const response = await api.get('/user-cvs/for-application');
    return response.data;
  },

  async getCVById(id: string): Promise<IApiResponse<IUserCV>> {
    const response = await api.get(`/user-cvs/${id}`);
    return response.data;
  },

  async uploadCV(formData: FormData): Promise<IApiResponse<IUserCV>> {
    const response = await api.post('/user-cvs/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  async createCV(data: { url: string; title?: string; description?: string; isPrimary?: boolean }): Promise<IApiResponse<IUserCV>> {
    const response = await api.post('/user-cvs', data);
    return response.data;
  },

  async updateCV(id: string, data: { title?: string; description?: string; isPrimary?: boolean }): Promise<IApiResponse<IUserCV>> {
    const response = await api.patch(`/user-cvs/${id}`, data);
    return response.data;
  },

  async setPrimaryCv(id: string): Promise<IApiResponse<any>> {
    const response = await api.patch(`/user-cvs/${id}/set-primary`);
    return response.data;
  },

  async deleteCV(id: string): Promise<IApiResponse<any>> {
    const response = await api.delete(`/user-cvs/${id}`);
    return response.data;
  },
};
