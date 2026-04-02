import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { validateLogin } from '../../utils/validators';
import './Auth.css';

const Login = ({ initialMessage }) => {
    // Hooks
    const navigate = useNavigate();
    const location = useLocation();
    const { login } = useAuth();

    // Get the page user tried to access before login
    const from = location.state?.from?.pathname || '/dashboard';

    // Form state
    const [formData, setFormData] = useState({
        email: '',
        password: ''
    });

    // UI state
    const [errors, setErrors] = useState({});
    const [apiError, setApiError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    // Add this after useState declarations
    useEffect(() => {
    if (initialMessage) {
        setApiError(initialMessage);
        // Change the alert type to success for registration success
        setTimeout(() => {
            const alertDiv = document.querySelector('.alert');
            if (alertDiv) {
                alertDiv.classList.add('alert-success');
                alertDiv.classList.remove('alert-error');
            }
        }, 100);
    }
       }, [initialMessage]);
    



    // Handle input changes
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
        // Clear field-specific error when user types
        if (errors[name]) {
            setErrors(prev => ({
                ...prev,
                [name]: ''
            }));
        }
        // Clear API error when user makes any change
        if (apiError) {
            setApiError('');
        }
    };

    // Handle form submission
    const handleSubmit = async (e) => {
        e.preventDefault();
        
        // Validate form
        const validation = validateLogin(formData);
        
        if (!validation.isValid) {
            setErrors(validation.errors);
            return;
        }

        // Clear any previous errors
        setErrors({});
        setApiError('');
        setIsLoading(true);

        try {
            // Attempt login
            await login(formData);
            
            // Redirect to dashboard or the page they came from
            navigate(from, { replace: true });
        } catch (error) {
            // Handle login error
            setApiError(error.message || 'Login failed. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-card">
                <div className="auth-header">
                    <h2>Welcome Back</h2>
                    <p>Sign in to your account</p>
                </div>

                {/* Error Alert */}
                {apiError && (
                    <div className="alert alert-error">
                        <span className="alert-icon">⚠️</span>
                        <span>{apiError}</span>
                        <button 
                            className="alert-close" 
                            onClick={() => setApiError('')}
                        >
                            ×
                        </button>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="auth-form">
                    {/* Email Field */}
                    <div className="form-group">
                        <label htmlFor="email">
                            Email Address <span className="required">*</span>
                        </label>
                        <div className="input-wrapper">
                            <span className="input-icon"></span>
                            <input
                                type="email"
                                id="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                placeholder="Enter your email"
                                className={errors.email ? 'error' : ''}
                                disabled={isLoading}
                                autoComplete="email"
                            />
                        </div>
                        {errors.email && (
                            <span className="error-message">{errors.email}</span>
                        )}
                    </div>

                    {/* Password Field */}
                    <div className="form-group">
                        <label htmlFor="password">
                            Password <span className="required">*</span>
                        </label>
                        <div className="input-wrapper">
                            <span className="input-icon"></span>
                            <input
                                type={showPassword ? 'text' : 'password'}
                                id="password"
                                name="password"
                                value={formData.password}
                                onChange={handleChange}
                                placeholder="Enter your password"
                                className={errors.password ? 'error' : ''}
                                disabled={isLoading}
                                autoComplete="current-password"
                            />
                            <button
                                type="button"
                                className="password-toggle"
                                onClick={() => setShowPassword(!showPassword)}
                                tabIndex="-1"
                            >
                                {showPassword ? '👁️' : '👁️‍🗨️'}
                            </button>
                        </div>
                        {errors.password && (
                            <span className="error-message">{errors.password}</span>
                        )}
                    </div>

                    {/* Remember Me & Forgot Password */}
                    <div className="form-options">
                        <label className="checkbox-label">
                            <input type="checkbox" name="remember" />
                            <span>Remember me</span>
                        </label>
                        <Link to="/forgot-password" className="forgot-link">
                            Forgot password?
                        </Link>
                    </div>

                    {/* Submit Button */}
                    <button 
                        type="submit" 
                        className="btn btn-primary btn-block"
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <>
                                <span className="spinner-small"></span>
                                Signing in...
                            </>
                        ) : (
                            'Sign In'
                        )}
                    </button>
                </form>

                {/* Register Link */}
                <div className="auth-footer">
                    <p>
                        Don't have an account?{' '}
                        <Link to="/register" className="auth-link">
                            Create one now
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Login;