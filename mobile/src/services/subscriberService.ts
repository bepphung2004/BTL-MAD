import api from './api';
import { IApiResponse, ISubscriber, ICreateSubscriberDto } from '../types';

export const subscriberService = {
  // Get current user's subscription
  async getMySubscription(): Promise<IApiResponse<ISubscriber | null>> {
    const response = await api.get('/subscribers/me');
    return response.data;
  },

  // Create or update subscription
  async createOrUpdate(data: ICreateSubscriberDto): Promise<IApiResponse<ISubscriber>> {
    const response = await api.post('/subscribers', data);
    return response.data;
  },

  // Toggle subscription active status
  async toggleActive(id: string): Promise<IApiResponse<ISubscriber>> {
    const response = await api.patch(`/subscribers/toggle-active/${id}`);
    return response.data;
  },

  // Delete subscription
  async deleteSubscription(id: string): Promise<IApiResponse<void>> {
    const response = await api.delete(`/subscribers/${id}`);
    return response.data;
  },
};
