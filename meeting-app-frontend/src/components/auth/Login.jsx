import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { validateLogin } from '../../utils/validators';
import { Mail, Lock, Eye, EyeOff, ArrowRight, Shield, Sun, Moon } from 'lucide-react';
import './Auth.css';

const Login = ({ initialMessage }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const { login } = useAuth();
    const { isDark, toggle } = useTheme();
    const from = location.state?.from?.pathname || '/dashboard';

    const [formData, setFormData] = useState({
        email: '',
        password: ''
    });

    const [errors, setErrors] = useState({});
    const [apiError, setApiError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    useEffect(() => {
        if (initialMessage) {
            setSuccessMessage(initialMessage);
        }
    }, [initialMessage]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: '' }));
        }
        if (apiError) setApiError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        const validation = validateLogin(formData);
        if (!validation.isValid) {
            setErrors(validation.errors);
            return;
        }

        setErrors({});
        setApiError('');
        setIsLoading(true);

        try {
            await login(formData);
            navigate(from, { replace: true });
        } catch (error) {
            setApiError(error.message || 'Login failed. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="modern-auth-container">
            {/* Theme Toggle */}
            <button
                onClick={toggle}
                className="theme-toggle-auth"
                aria-label="Toggle theme"
            >
                {isDark ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            {/* Background Effects */}
            <div className="auth-bg-effects">
                <div className="auth-glow auth-glow-1" />
                <div className="auth-glow auth-glow-2" />
                <div className="auth-grid-bg" />
            </div>

            <div className="modern-auth-card">
                {/* Logo/Brand */}
                <div className="auth-brand">
                    <div className="auth-brand-icon">
                        <Shield size={24} />
                    </div>
                    <h1>Welcome Back</h1>
                    <p>Sign in to continue to your secure meetings</p>
                </div>

                {/* Success Message */}
                {successMessage && (
                    <div className="modern-alert modern-alert-success">
                        <span>✓</span>
                        <span>{successMessage}</span>
                    </div>
                )}

                {/* Error Message */}
                {apiError && (
                    <div className="modern-alert modern-alert-error">
                        <span>⚠</span>
                        <span>{apiError}</span>
                        <button onClick={() => setApiError('')}>×</button>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="modern-auth-form">
                    {/* Email Field */}
                    <div className="modern-form-group">
                        <label htmlFor="email">Email Address</label>
                        <div className="modern-input-wrapper">
                            <Mail size={18} className="input-icon-left" />
                            <input
                                type="email"
                                id="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                placeholder="you@example.com"
                                className={errors.email ? 'error' : ''}
                                disabled={isLoading}
                                autoComplete="email"
                            />
                        </div>
                        {errors.email && <span className="modern-error">{errors.email}</span>}
                    </div>

                    {/* Password Field */}
                    <div className="modern-form-group">
                        <label htmlFor="password">Password</label>
                        <div className="modern-input-wrapper">
                            <Lock size={18} className="input-icon-left" />
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
                                className="input-icon-right"
                                onClick={() => setShowPassword(!showPassword)}
                                tabIndex="-1"
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                        {errors.password && <span className="modern-error">{errors.password}</span>}
                    </div>

                    {/* Remember & Forgot */}
                    <div className="auth-options">
                        <label className="modern-checkbox">
                            <input type="checkbox" />
                            <span>Remember me</span>
                        </label>
                        <Link to="/forgot-password" className="forgot-link">
                            Forgot password?
                        </Link>
                    </div>

                    {/* Submit Button */}
                    <button 
                        type="submit" 
                        className="modern-btn-primary"
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <>
                                <span className="btn-spinner" />
                                Signing in...
                            </>
                        ) : (
                            <>
                                Sign In
                                <ArrowRight size={18} />
                            </>
                        )}
                    </button>
                </form>

                {/* Register Link */}
                <div className="auth-footer-link">
                    <p>
                        Don't have an account?{' '}
                        <Link to="/register">Create one now</Link>
                    </p>
                </div>

                {/* Back to Home */}
                <div className="auth-back-home">
                    <Link to="/">← Back to Home</Link>
                </div>
            </div>
        </div>
    );
};

export default Login;
