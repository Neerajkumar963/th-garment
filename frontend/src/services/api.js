import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth API
export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  verify: (token) => api.post('/auth/verify', { token }),
};

// Dashboard API
export const dashboardAPI = {
  getSummary: () => api.get('/dashboard/summary'),
};

// Cutting API
export const cuttingAPI = {
  getQueue: () => api.get('/cutting/queue'),
  getHistory: () => api.get('/cutting/history'),
  getClothTypes: () => api.get('/cutting/cloth-types'),
  addToQueue: (data) => api.post('/cutting/queue', data),
  completeCutting: (id) => api.put(`/cutting/complete/${id}`),
  deleteFromQueue: (id) => api.delete(`/cutting/queue/${id}`),
};

// Processing API
export const processingAPI = {
  getActive: () => api.get('/processing/active'),
  getDelivered: () => api.get('/processing/delivered'),
  getAvailableCutStock: () => api.get('/processing/available-cut-stock'),
  startProcessing: (data) => api.post('/processing/start', data),
  advanceStage: (id) => api.put(`/processing/advance/${id}`),
  completeProcessing: (id) => api.put(`/processing/complete/${id}`),
};

// Stock API
export const stockAPI = {
  getClothStock: () => api.get('/stock/cloth'),
  addClothStock: (data) => api.post('/stock/cloth', data),
  getCutStock: () => api.get('/stock/cut'),
  getSellingStock: () => api.get('/stock/selling'),
  getDeadStock: () => api.get('/stock/dead'),
  addDeadStock: (data) => api.post('/stock/dead', data),
  getClothTypes: () => api.get('/stock/cloth-types'),
  addClothType: (data) => api.post('/stock/cloth-types', data),
};

// Orders API
export const ordersAPI = {
  getAll: (status) => api.get('/orders', { params: { status } }),
  getById: (id) => api.get(`/orders/${id}`),
  create: (data) => api.post('/orders', data),
  updateStatus: (id, status) => api.put(`/orders/${id}/status`, { status }),
  delete: (id) => api.delete(`/orders/${id}`),
};

export default api;
