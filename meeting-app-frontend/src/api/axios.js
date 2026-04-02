import axios from 'axios';

// Get API URL from environment variables
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Create axios instance with default config
const axiosInstance = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 10000, // 10 seconds timeout
});

// Request interceptor - runs before every request
axiosInstance.interceptors.request.use(
    (config) => {
        // Get token from localStorage
        const token = localStorage.getItem('token');
        
        // If token exists, add it to Authorization header
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
            console.log('Token added to request:', config.url);
        }
        
        return config;
    },
    (error) => {
        console.error('Request error:', error);
        return Promise.reject(error);
    }
);

// Response interceptor - runs after every response
axiosInstance.interceptors.response.use(
    (response) => {
        // Any status code within 2xx triggers this
        console.log('Response received:', response.config.url);
        return response;
    },
    (error) => {
        // Any status code outside 2xx triggers this
        console.error('Response error:', error.response?.status, error.config?.url);
        
        // Handle 401 Unauthorized errors (token expired or invalid)
        if (error.response?.status === 401) {
            console.log('Token expired or invalid - logging out');
            
            // Clear local storage
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            
            // Redirect to login page if not already there
            if (!window.location.pathname.includes('/login')) {
                window.location.href = '/login';
            }
        }
        
        // Return a standardized error object
        return Promise.reject({
            message: error.response?.data?.message || 'An error occurred',
            status: error.response?.status,
            data: error.response?.data
        });
    }
);

export default axiosInstance;