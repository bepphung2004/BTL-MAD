import api from './api';
import { IApiResponse, INotification, IPaginatedResponse } from '../types';

export const notificationService = {
  async getNotifications(page: number = 1, limit: number = 20): Promise<IApiResponse<IPaginatedResponse<INotification> & { unreadCount: number }>> {
    const response = await api.get(`/notifications?page=${page}&limit=${limit}`);
    return response.data;
  },

  async markAsRead(id: string): Promise<IApiResponse<any>> {
    const response = await api.patch(`/notifications/${id}/read`);
    return response.data;
  },

  async markAllAsRead(): Promise<IApiResponse<any>> {
    const response = await api.post('/notifications/mark-all-read');
    return response.data;
  },

  async getUnreadCount(): Promise<IApiResponse<number>> {
    const response = await api.get('/notifications/unread-count');
    return response.data;
  },

  async deleteNotification(id: string): Promise<IApiResponse<any>> {
    const response = await api.delete(`/notifications/${id}`);
    return response.data;
  },
};
