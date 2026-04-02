import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';

/**
 * Custom hook for accessing authentication state and methods
 * 
 * This hook provides a clean interface to the AuthContext.
 * It throws an error if used outside of AuthProvider.
 * 
 * Usage:
 * const { user, login, logout, isAuthenticated } = useAuth();
 */
export const useAuth = () => {
    const context = useContext(AuthContext);
    
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    
    return context;
};

// Also export a default for convenience
export default useAuth;