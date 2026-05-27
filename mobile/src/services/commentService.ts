import api from './api';
import { IApiResponse, IComment, IPaginatedResponse } from '../types';

export interface ICreateCommentDto {
  companyId: string;
  content: string;
  rating?: number;
  parentId?: string;
}

export const commentService = {
  async getCommentsByCompany(companyId: string, page: number = 1, limit: number = 10): Promise<IApiResponse<IPaginatedResponse<IComment>>> {
    const response = await api.get(`/comments/by-company/${companyId}?current=${page}&pageSize=${limit}`);
    return response.data;
  },

  async getCommentsByParent(parentId: string, page: number = 1, limit: number = 10): Promise<IApiResponse<IPaginatedResponse<IComment>>> {
    const response = await api.get(`/comments/parent/${parentId}?current=${page}&pageSize=${limit}`);
    return response.data;
  },

  async createComment(data: ICreateCommentDto): Promise<IApiResponse<IComment>> {
    const response = await api.post('/comments', data);
    return response.data;
  },

  async updateComment(id: string, data: { content: string; rating?: number }): Promise<IApiResponse<IComment>> {
    const response = await api.patch(`/comments/${id}`, data);
    return response.data;
  },

  async deleteComment(id: string): Promise<IApiResponse<any>> {
    const response = await api.delete(`/comments/${id}`);
    return response.data;
  },

  async getAverageRating(companyId: string): Promise<IApiResponse<{ averageRating: number; totalReviews: number }>> {
    const response = await api.get(`/comments/rating/${companyId}`);
    return response.data;
  },
};
