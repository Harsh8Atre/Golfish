import api from './api';

export const scoreService = {
  getScores: async () => {
    const response = await api.get('/scores');
    return response.data;
  },

  createScore: async (score, playedAt) => {
    const response = await api.post('/scores', { score, playedAt });
    return response.data;
  },

  updateScore: async (id, score, playedAt) => {
    const response = await api.put(`/scores/${id}`, { score, playedAt });
    return response.data;
  }
};
