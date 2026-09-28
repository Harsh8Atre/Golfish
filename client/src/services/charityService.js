import api from './api';

export const charityService = {
  getCharities: async () => {
    const response = await api.get('/charities');
    return response.data;
  }
};
