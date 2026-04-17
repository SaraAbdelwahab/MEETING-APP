import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { validateRegister } from '../../utils/validators';
import { Mail, Lock, Eye, EyeOff, ArrowRight, Shield, User, Sun, Moon } from 'lucide-react';
import './Auth.css';

const Register = () => {
    const navigate = useNavigate();
    const { register } = useAuth();
    const { isDark, toggle } = useTheme();

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        confirmPassword: ''
    });

    const [errors, setErrors] = useState({});
    const [apiError, setApiError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [acceptedTerms, setAcceptedTerms] = useState(false);

    const getPasswordStrength = (password) => {
        let strength = 0;
        if (password.length >= 6) strength++;
        if (/[A-Za-z]/.test(password)) strength++;
        if (/\d/.test(password)) strength++;
        if (/[!@#$%^&*]/.test(password)) strength++;
        return strength;
    };

    const passwordStrength = getPasswordStrength(formData.password);
    const strengthLabels = ['Too weak', 'Weak', 'Fair', 'Good', 'Strong'];
    const strengthColors = ['#ff4444', '#ff4444', '#ffbb33', '#00C851', '#007E33'];

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
        
        const validation = validateRegister(formData);
        if (!validation.isValid) {
            setErrors(validation.errors);
            return;
        }

        if (!acceptedTerms) {
            setApiError('Please accept the Terms and Conditions');
            return;
        }

        setErrors({});
        setApiError('');
        setIsLoading(true);

        try {
            await register({
                name: formData.name,
                email: formData.email,
                password: formData.password
            });
            
            navigate('/login', { 
                state: { 
                    message: 'Registration successful! Please login.' 
                }
            });
        } catch (error) {
            setApiError(error.message || 'Registration failed. Please try again.');
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
                    <h1>Create Account</h1>
                    <p>Join thousands of professionals using secure meetings</p>
                </div>

                {/* Error Message */}
                {apiError && (
                    <div className="modern-alert modern-alert-error">
                        <span>⚠</span>
                        <span>{apiError}</span>
                        <button onClick={() => setApiError('')}>×</button>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="modern-auth-form">
                    {/* Name Field */}
                    <div className="modern-form-group">
                        <label htmlFor="name">Full Name</label>
                        <div className="modern-input-wrapper">
                            <User size={18} className="input-icon-left" />
                            <input
                                type="text"
                                id="name"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                placeholder="John Doe"
                                className={errors.name ? 'error' : ''}
                                disabled={isLoading}
                                autoComplete="name"
                            />
                        </div>
                        {errors.name && <span className="modern-error">{errors.name}</span>}
                    </div>

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
                                placeholder="Create a strong password"
                                className={errors.password ? 'error' : ''}
                                disabled={isLoading}
                                autoComplete="new-password"
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
                        
                        {/* Password Strength */}
                        {formData.password && (
                            <div className="password-strength-modern">
                                <div className="strength-bars">
                                    {[1, 2, 3, 4].map((level) => (
                                        <div
                                            key={level}
                                            className="strength-bar"
                                            style={{
                                                backgroundColor: level <= passwordStrength 
                                                    ? strengthColors[passwordStrength] 
                                                    : 'rgba(255,255,255,0.1)',
                                            }}
                                        />
                                    ))}
                                </div>
                                <span 
                                    className="strength-label"
                                    style={{ color: strengthColors[passwordStrength] }}
                                >
                                    {strengthLabels[passwordStrength]}
                                </span>
                            </div>
                        )}
                        
                        {errors.password && <span className="modern-error">{errors.password}</span>}
                    </div>

                    {/* Confirm Password Field */}
                    <div className="modern-form-group">
                        <label htmlFor="confirmPassword">Confirm Password</label>
                        <div className="modern-input-wrapper">
                            <Lock size={18} className="input-icon-left" />
                            <input
                                type={showConfirmPassword ? 'text' : 'password'}
                                id="confirmPassword"
                                name="confirmPassword"
                                value={formData.confirmPassword}
                                onChange={handleChange}
                                placeholder="Confirm your password"
                                className={errors.confirmPassword ? 'error' : ''}
                                disabled={isLoading}
                                autoComplete="new-password"
                            />
                            <button
                                type="button"
                                className="input-icon-right"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                tabIndex="-1"
                            >
                                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                        {errors.confirmPassword && <span className="modern-error">{errors.confirmPassword}</span>}
                    </div>

                    {/* Terms Checkbox */}
                    <div className="modern-form-group">
                        <label className="modern-checkbox">
                            <input
                                type="checkbox"
                                checked={acceptedTerms}
                                onChange={(e) => setAcceptedTerms(e.target.checked)}
                                disabled={isLoading}
                            />
                            <span>
                                I accept the <Link to="/terms" target="_blank">Terms of Service</Link> and <Link to="/privacy" target="_blank">Privacy Policy</Link>
                            </span>
                        </label>
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
                                Creating Account...
                            </>
                        ) : (
                            <>
                                Create Account
                                <ArrowRight size={18} />
                            </>
                        )}
                    </button>
                </form>

                {/* Login Link */}
                <div className="auth-footer-link">
                    <p>
                        Already have an account?{' '}
                        <Link to="/login">Sign in</Link>
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

export default Register;
