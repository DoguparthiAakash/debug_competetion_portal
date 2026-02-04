/// <reference types="vite/client" />
import axios from 'axios';

// Automatically detect API URL from environment
const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

console.log('🌐 API Base URL:', BASE_URL);

// Create Axios instance
const api = axios.create({
    baseURL: BASE_URL,
    timeout: 60000, // 60s timeout for Docker execution
    headers: {
        'Content-Type': 'application/json'
    }
});

// Interceptor: Attach Admin JWT if present
api.interceptors.request.use((config) => {
    const token = sessionStorage.getItem('adminToken');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Interceptor: Handle Errors
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.code === 'ECONNABORTED') {
            console.error('⚠️ Request timeout - server may be overloaded');
        } else if (error.message === 'Network Error') {
            console.error('⚠️ Network error - check if backend is running');
        }
        return Promise.reject(error);
    }
);

export default api;
