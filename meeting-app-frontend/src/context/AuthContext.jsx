import React, { createContext, useState, useEffect, useContext } from 'react';
import authAPI from '../api/auth';

// ✅ Export the context
export const AuthContext = createContext(null);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    useEffect(() => {
        const checkAuth = () => {
            try {
                const token = authAPI.getToken();
                const storedUser = authAPI.getCurrentUser();
                
                if (token && storedUser) {
                    setUser(storedUser);
                    setIsAuthenticated(true);
                    console.log('✅ User authenticated:', storedUser.email);
                } else {
                    console.log('🔓 No user authenticated');
                }
            } catch (error) {
                console.error('❌ Auth check failed:', error);
            } finally {
                setLoading(false);
            }
        };

        checkAuth();
    }, []);

    const login = async (credentials) => {
        try {
            const response = await authAPI.login(credentials);
            setUser(response.user);
            setIsAuthenticated(true);
            console.log('✅ Login successful:', response.user.email);
            return response;
        } catch (error) {
            console.error('❌ Login failed:', error.message);
            throw error;
        }
    };

    const register = async (userData) => {
        try {
            const response = await authAPI.register(userData);
            console.log('✅ Registration successful:', response.user.email);
            return response;
        } catch (error) {
            console.error('❌ Registration failed:', error.message);
            throw error;
        }
    };

    const logout = () => {
        authAPI.logout();
        setUser(null);
        setIsAuthenticated(false);
        console.log('🔒 Logout successful');
    };

    const updateUser = (userData) => {
        setUser(userData);
        localStorage.setItem('user', JSON.stringify(userData));
    };

    const value = {
        user,
        loading,
        isAuthenticated,
        login,
        register,
        logout,
        updateUser
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};