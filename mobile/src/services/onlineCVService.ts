import api from './api';
import { IApiResponse } from '../types';

export interface IOnlineCV {
  _id: string;
  templateType: 'template1' | 'template2';
  fullName: string;
  position?: string;
  phone?: string;
  email?: string;
  link?: string;
  address?: string;
  avatar?: string;
  careerObjective?: string;
  education?: {
    schoolName?: string;
    major?: string;
    startDate?: string;
    endDate?: string;
    description?: string;
  }[];
  workExperience?: {
    companyName?: string;
    position?: string;
    startDate?: string;
    endDate?: string;
    description?: string;
  }[];
  skills?: {
    name?: string;
    description?: string;
  }[];
  activities?: {
    organizationName?: string;
    position?: string;
    startDate?: string;
    endDate?: string;
    description?: string;
  }[];
  certificates?: {
    name?: string;
    date?: string;
  }[];
  awards?: {
    name?: string;
    date?: string;
  }[];
  pdfUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateOnlineCVDto {
  templateType: 'template1' | 'template2';
  fullName: string;
  position?: string;
  phone?: string;
  email?: string;
  link?: string;
  address?: string;
  avatar?: string;
  careerObjective?: string;
  education?: IOnlineCV['education'];
  workExperience?: IOnlineCV['workExperience'];
  skills?: IOnlineCV['skills'];
  activities?: IOnlineCV['activities'];
  certificates?: IOnlineCV['certificates'];
  awards?: IOnlineCV['awards'];
}

export const onlineCVService = {
  async getMyOnlineCVs(): Promise<IApiResponse<IOnlineCV[]>> {
    const response = await api.get('/online-cvs');
    return response.data;
  },

  async getOnlineCVById(id: string): Promise<IApiResponse<IOnlineCV>> {
    const response = await api.get(`/online-cvs/${id}`);
    return response.data;
  },

  async createOnlineCV(data: CreateOnlineCVDto): Promise<IApiResponse<IOnlineCV>> {
    const response = await api.post('/online-cvs', data);
    return response.data;
  },

  async updateOnlineCV(id: string, data: Partial<CreateOnlineCVDto>): Promise<IApiResponse<IOnlineCV>> {
    const response = await api.patch(`/online-cvs/${id}`, data);
    return response.data;
  },

  async getPreviewHTML(id: string): Promise<IApiResponse<{ html: string }>> {
    const response = await api.get(`/online-cvs/${id}/preview`);
    return response.data;
  },

  async exportToPdf(id: string): Promise<IApiResponse<{ _id: string; pdfUrl: string; message: string }>> {
    const response = await api.post(`/online-cvs/${id}/export`);
    return response.data;
  },

  async deleteOnlineCV(id: string): Promise<IApiResponse<any>> {
    const response = await api.delete(`/online-cvs/${id}`);
    return response.data;
  },
};

export default onlineCVService;
