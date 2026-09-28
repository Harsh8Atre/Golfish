import api from './api';

export const adminService = {
  getOverview: async () => {
    const res = await api.get('/admin/overview');
    return res.data;
  },
  
  getUsers: async () => {
    const res = await api.get('/admin/users');
    return res.data;
  },

  getCharities: async () => {
    const res = await api.get('/admin/charities');
    return res.data;
  },

  createCharity: async (data) => {
    const res = await api.post('/admin/charities', data);
    return res.data;
  },

  updateCharity: async (id, data) => {
    const res = await api.put(`/admin/charities/${id}`, data);
    return res.data;
  },

  setCharityStatus: async (id, active) => {
    const res = await api.patch(`/admin/charities/${id}/status`, { active });
    return res.data;
  },

  simulateDraw: async (month) => {
    const res = await api.post('/draws/simulate', { month });
    return res.data;
  },

  publishDraw: async (month, numbers) => {
    const res = await api.post('/draws/publish', { month, numbers });
    return res.data;
  },

  getWinners: async () => {
    const res = await api.get('/admin/winners');
    return res.data;
  },

  verifyWinner: async (id, status, adminNote) => {
    const res = await api.post(`/admin/winners/${id}/verify`, { status, adminNote });
    return res.data;
  },

  processPayout: async (id) => {
    const res = await api.post(`/admin/winners/${id}/payout`);
    return res.data;
  },

  getReports: async () => {
    const res = await api.get('/admin/reports');
    return res.data;
  }
};
