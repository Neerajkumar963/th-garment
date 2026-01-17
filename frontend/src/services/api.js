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
  deleteQueueItem: (id) => api.delete(`/cutting/queue/${id}`), // Soft Delete now
  
  // Cutting Soft Delete
  getRecycleBin: () => api.get('/cutting/recycle-bin'),
  restoreQueueItem: (id) => api.put(`/cutting/restore/${id}`),
  permanentDeleteItem: (id) => api.delete(`/cutting/permanent/${id}`),
};

// Processing API
export const processingAPI = {
  getActiveItems: () => api.get('/processing/active'),
  getDeliveredItems: () => api.get('/processing/delivered'),
  getAvailableCutStock: () => api.get('/processing/available-cut-stock'),
  startProcessing: (data) => api.post('/processing/start', data),
  advanceStage: (id) => api.put(`/processing/advance/${id}`),
  completeProcessing: (id) => api.put(`/processing/complete/${id}`),
  deleteItem: (id) => api.delete(`/processing/${id}`), // Soft Delete
  
  // Processing Soft Delete
  getRecycleBin: () => api.get('/processing/recycle-bin'),
  restoreItem: (id) => api.put(`/processing/restore/${id}`),
  permanentDeleteItem: (id) => api.delete(`/processing/permanent/${id}`),
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
  
  // Stock Soft Delete
  deleteStock: (type, id) => api.delete(`/stock/${type}/${id}`),
  getStockRecycleBin: (type) => api.get(`/stock/recycle-bin/${type}`),
  restoreStock: (type, id) => api.put(`/stock/restore/${type}/${id}`),
  permanentDeleteStock: (type, id) => api.delete(`/stock/permanent/${type}/${id}`),
};

// Orders API
export const ordersAPI = {
  getAll: (status) => api.get('/orders', { params: { status } }),
  getById: (id) => api.get(`/orders/${id}`),
  create: (data) => api.post('/orders', data),
  updateStatus: (id, status) => api.put(`/orders/${id}/status`, { status }),
  delete: (id) => api.delete(`/orders/${id}`),
  // Recycle Bin
  getRecycleBin: () => api.get('/orders/recycle-bin/list'),
  restore: (id) => api.put(`/orders/restore/${id}`),
  permanentDelete: (id) => api.delete(`/orders/permanent/${id}`),
};

// Fabricators API
export const fabricatorsAPI = {
  getAll: (status) => api.get('/fabricators', { params: { status } }),
  getById: (id) => api.get(`/fabricators/${id}`),
  create: (data) => api.post('/fabricators', data),
  update: (id, data) => api.put(`/fabricators/${id}`, data),
  delete: (id) => api.delete(`/fabricators/${id}`),
};

// Job Works API
export const jobWorksAPI = {
  getAll: (params) => api.get('/job-works', { params }),
  getPending: () => api.get('/job-works/pending'),
  getById: (id) => api.get(`/job-works/${id}`),
  issue: (data) => api.post('/job-works/issue', data),
  receive: (id, data) => api.post(`/job-works/${id}/receive`, data),
  markDead: (id, data) => api.put(`/job-works/${id}/mark-dead`, data),
  delete: (id) => api.delete(`/job-works/${id}`),
};

// Ready Items API
export const readyItemsAPI = {
  getAll: () => api.get('/ready-items'),
  getById: (id) => api.get(`/ready-items/${id}`),
  getAllStock: () => api.get('/ready-items/stock/all'),
  create: (data) => api.post('/ready-items', data),
  update: (id, data) => api.put(`/ready-items/${id}`, data),
  addStock: (id, data) => api.post(`/ready-items/${id}/stock`, data),
  delete: (id) => api.delete(`/ready-items/${id}`),
};

// Sales API
export const salesAPI = {
  getAvailable: () => api.get('/sales/available'),
  create: (data) => api.post('/sales', data),
  getHistory: () => api.get('/sales/history'),
};

export default api;
