import axios from 'axios';

const isLocalhost = 
    window.location.hostname === 'localhost' || 
    window.location.hostname === '127.0.0.1' || 
    window.location.hostname === '::1' ||
    window.location.hostname.startsWith('192.168.') ||
    window.location.hostname.startsWith('10.') ||
    window.location.hostname.startsWith('172.');

const API_URL = import.meta.env.VITE_API_URL || (isLocalhost ? 'http://localhost:5000/api' : 'https://dromoney.onrender.com/api');
export const BASE_URL = API_URL.replace('/api', '');

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor for API calls
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('dromoney_token');
        const adminToken = localStorage.getItem('dromoney_admin_token');
        // Determine if request is for admin routes
        const isAdminRequest = config.url?.includes('/admin') || window.location.pathname.startsWith('/admin');
        if (isAdminRequest && adminToken) {
            config.headers.Authorization = `Bearer ${adminToken}`;
        } else if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        // Debug log to verify which token is used
        console.debug('API request', config.method?.toUpperCase(), config.url, 'Authorization set:', !!config.headers.Authorization);
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor to handle errors
api.interceptors.response.use(
    (response) => {
        // Don't transform blob responses
        if (response.data instanceof Blob) {
            return response.data;
        }
        return response.data;
    },
    (error) => {
        let message = 'Something went wrong';
        
        if (error.response?.data) {
            if (typeof error.response.data === 'string') {
                // Parse standard short Express messages like "Cannot DELETE /api/..." or similar plain text errors
                if (error.response.data.length < 200) {
                    message = error.response.data;
                } else if (error.response.data.includes('<pre>')) {
                    // Extract Express route error from HTML error response if present
                    const match = error.response.data.match(/<pre>([\s\S]*?)<\/pre>/);
                    if (match && match[1]) {
                        message = match[1].trim();
                    }
                }
            } else {
                message = error.response.data.error || error.response.data.message || 'Something went wrong';
            }
        } else if (error.message) {
            message = error.message;
        }

        const status = error.response?.status;
        console.error('API Error:', message);

        // Auto-logout on 401 Unauthorized — token is expired or invalid
        if (status === 401) {
            const url = error.config?.url || '';
            const isAdminApi = url.includes('/admin/');
            const isUserApi = url.includes('/user/') || url.includes('/reward/');
            const isAdminPath = window.location.pathname.startsWith('/admin');

            if (isAdminApi || (isAdminPath && !isUserApi)) {
                localStorage.removeItem('dromoney_admin_token');
                if (isAdminPath && !window.location.pathname.includes('/admin/login')) {
                    window.location.href = '/admin/login';
                }
            } else {
                localStorage.removeItem('dromoney_token');
                if (!isAdminPath && !window.location.pathname.includes('/user/auth/login')) {
                    window.location.href = '/user/auth/login';
                }
            }
        }

        return Promise.reject({ message, status });
    }
);

export default api;
