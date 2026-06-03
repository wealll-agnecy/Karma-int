import axios from 'axios';
import API_BASE_URL from '../config/apiConfig';
import { sanitizeObject } from '../utils/fixEncoding';

// Create a professional Axios instance
const apiClient = axios.create({
    baseURL: API_BASE_URL,
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    }
});

// Request Interceptor: Attach the Token to ALL requests
apiClient.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response Interceptor: Handle Global Errors (like 401 Unauthorized)
apiClient.interceptors.response.use(
    (response) => {
        // Global Encoding Sanitization: Ensure NO corrupted data renders anywhere
        if (response && response.data) {
            response.data = sanitizeObject(response.data);
        }
        return response;
    },
    async (error) => {
        const config = error.config;
        
        // --- API RETRY MECHANISM (Phase 13) ---
        if (config) {
            config.retryCount = config.retryCount || 0;
            const MAX_RETRIES = 3;
            // Retry on Network Error (no response) or Server Error (5xx)
            const isRetryable = !error.response || (error.response.status >= 500 && error.response.status <= 599);
            
            if (isRetryable && config.retryCount < MAX_RETRIES) {
                config.retryCount += 1;
                const delay = Math.pow(2, config.retryCount) * 500; // Exponential backoff: 1s, 2s, 4s
                console.warn(`🔄 API Retry ${config.retryCount}/${MAX_RETRIES} for ${config.url} after ${delay}ms`);
                await new Promise(resolve => setTimeout(resolve, delay));
                return apiClient(config);
            }
        }

        // Handle session expiry
        if (error.response?.status === 401) {
            console.warn("🔒 Connectivity Protocol Breach: Auto-purging stale identifiers.");
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            
            // Redirect to login if not already there and if user was supposed to be logged in
            const publicPaths = ['/login', '/register', '/', '/forgot-password', '/reset-password', '/checkout', '/events', '/digital-pass', '/tickets', '/ticket', '/verify-ticket', '/reels'];
            const isPublic = publicPaths.some(path => 
                window.location.pathname === path || 
                window.location.pathname.startsWith('/reset-password/') ||
                window.location.pathname.startsWith('/events/') ||
                window.location.pathname.startsWith('/checkout') ||
                window.location.pathname.startsWith('/digital-pass/') ||
                window.location.pathname.startsWith('/tickets/') ||
                window.location.pathname.startsWith('/ticket/') ||
                window.location.pathname.startsWith('/verify-ticket/') ||
                window.location.pathname.startsWith('/reels')
            );
            
            if (!isPublic && !window.location.pathname.includes('login')) {
                window.location.href = '/login';
            }
        }
        
        // Debug Logger for the developer
        console.error(`🌐 [API_ERROR] ${error.config?.method?.toUpperCase()} ${error.config?.url}:`, 
            error.response?.data?.message || error.message);
            
        return Promise.reject(error);
    }
);

export default apiClient;
