import axios from 'axios';

let apiBaseUrl = import.meta.env.VITE_API_URL || '/api';
if (apiBaseUrl && !apiBaseUrl.endsWith('/api')) {
  apiBaseUrl = apiBaseUrl.replace(/\/$/, '') + '/api';
}

const api = axios.create({
  baseURL: apiBaseUrl,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // Future: Add auth token here
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const message = error.response?.data?.message || error.message || 'An unexpected error occurred';
    console.error('API Error:', message);
    return Promise.reject({ message, status: error.response?.status });
  }
);

export default api;
