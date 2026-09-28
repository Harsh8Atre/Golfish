import api from './api';

export const subscriptionService = {
  checkout: async (plan, charityId, charityPercentage) => {
    const response = await api.post('/subscriptions/checkout', {
      plan,
      charityId,
      charityPercentage
    });
    return response.data;
  },

  getMe: async () => {
    const response = await api.get('/subscriptions/me');
    return response.data;
  },

  cancel: async () => {
    const response = await api.post('/subscriptions/cancel');
    return response.data;
  }
};
