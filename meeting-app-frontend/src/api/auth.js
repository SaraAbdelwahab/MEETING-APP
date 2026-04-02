import axiosInstance from './axios';

/**
  Authentication API service
  All functions return promises and handle errors consistently
 */
const authAPI = {
    /**
     * Register a new user
     * @param {Object} userData - { name, email, password }
     * @returns {Promise} - { message, user }
     */
    register: async (userData) => {
        try {
            const response = await axiosInstance.post('/auth/register', userData);
            return response.data;
        } catch (error) {
            // Re-throw with consistent format
            throw {
                
             message: error.message || 'Registration failed',
                status: error.status

            };
        }
    },

    /**
     * Login user
     * @param {Object} credentials - { email, password }
     * @returns {Promise} - { message, token, user }
     */
    login: async (credentials) => {
        try {
            const response = await axiosInstance.post('/auth/login', credentials);
            
            // Destructure response data
            const { token, user } = response.data;
            
            // Store in localStorage
            if (token) {
                localStorage.setItem('token', token);
                localStorage.setItem('user', JSON.stringify(user));
            }
            
            return response.data;
        } catch (error) {
            throw {
                message: error.response?.data?.message || 'Login failed',
                 status: error.response?.status
            };
        }
    },

    /**
     * Logout user
     * Clears local storage only (backend JWT is stateless)
     */
    logout: () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
    },

    /**
     * Get current user from localStorage
     * @returns {Object|null} - User object or null
     */
    getCurrentUser: () => {
        const user = localStorage.getItem('user');
        return user ? JSON.parse(user) : null;
    },

    /**
     * Check if user is authenticated
     * @returns {boolean}
     */
    isAuthenticated: () => {
        return !!localStorage.getItem('token');
    },

    /**
     * Get stored token
     * @returns {string|null}
     */
    getToken: () => {
        return localStorage.getItem('token');
    }
};

export default authAPI;