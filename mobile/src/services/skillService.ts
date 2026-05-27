import api from './api';
import { IApiResponse, IPaginatedResponse, ISkill } from '../types';

export const skillService = {
  async getSkills(): Promise<IApiResponse<IPaginatedResponse<ISkill>>> {
    const response = await api.get('/skills');
    return response.data;
  },

  async getSkillById(id: string): Promise<IApiResponse<ISkill>> {
    const response = await api.get(`/skills/${id}`);
    return response.data;
  },

  async createSkill(name: string): Promise<IApiResponse<ISkill>> {
    const response = await api.post('/skills', { name });
    return response.data;
  },
};
