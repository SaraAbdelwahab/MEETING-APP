import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { validateRegister } from '../../utils/validators';
import './Auth.css';

const Register = () => {
    const navigate = useNavigate();
    const { register } = useAuth();

    // Form state
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        confirmPassword: ''
    });

    // UI state
    const [errors, setErrors] = useState({});
    const [apiError, setApiError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [acceptedTerms, setAcceptedTerms] = useState(false);

    // Password strength indicators
    const getPasswordStrength = (password) => {
        let strength = 0;
        if (password.length >= 6) strength++;
        if (/[A-Za-z]/.test(password)) strength++;
        if (/\d/.test(password)) strength++;
        if (/[!@#$%^&*]/.test(password)) strength++;
        return strength;
    };

    const passwordStrength = getPasswordStrength(formData.password);
    const strengthText = ['Weak', 'Fair', 'Good', 'Strong'];
    const strengthColor = ['#ff4444', '#ffbb33', '#00C851', '#007E33'];

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
        const validation = validateRegister(formData);
        
        if (!validation.isValid) {
            setErrors(validation.errors);
            return;
        }

        if (!acceptedTerms) {
            setApiError('Please accept the Terms and Conditions');
            return;
        }

        // Clear any previous errors
        setErrors({});
        setApiError('');
        setIsLoading(true);

        try {
            // Attempt registration
            await register({
                name: formData.name,
                email: formData.email,
                password: formData.password
            });
            
            // Show success message and redirect to login
            navigate('/login', { 
                state: { 
                    message: 'Registration successful! Please login.' 
                }
            });
        } catch (error) {
            // Handle registration error
            setApiError(error.message || 'Registration failed. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-card register-card">
                <div className="auth-header">
                    <h2>Create Account</h2>
                    <p>Join Meeting App today</p>
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
                    {/* Name Field */}
                    <div className="form-group">
                        <label htmlFor="name">
                            Full Name <span className="required">*</span>
                        </label>
                        <div className="input-wrapper">
                            <span className="input-icon"></span>
                            <input
                                type="text"
                                id="name"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                placeholder="Enter your full name"
                                className={errors.name ? 'error' : ''}
                                disabled={isLoading}
                                autoComplete="name"
                            />
                        </div>
                        {errors.name && (
                            <span className="error-message">{errors.name}</span>
                        )}
                    </div>

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
                                placeholder="Create a password"
                                className={errors.password ? 'error' : ''}
                                disabled={isLoading}
                                autoComplete="new-password"
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
                        
                        {/* Password strength indicator */}
                        {formData.password && (
                            <div className="password-strength">
                                <div className="strength-bars">
                                    {[1, 2, 3, 4].map((level) => (
                                        <div
                                            key={level}
                                            className="strength-bar"
                                            style={{
                                                backgroundColor: level <= passwordStrength 
                                                    ? strengthColor[passwordStrength - 1] 
                                                    : '#ddd',
                                                width: '25%'
                                            }}
                                        />
                                    ))}
                                </div>
                                <span 
                                    className="strength-text"
                                    style={{ color: strengthColor[passwordStrength - 1] }}
                                >
                                    {strengthText[passwordStrength - 1] || 'Too weak'}
                                </span>
                            </div>
                        )}
                        
                        {errors.password && (
                            <span className="error-message">{errors.password}</span>
                        )}
                        <small className="hint">
                            Password must be at least 6 characters with letters and numbers
                        </small>
                    </div>

                    {/* Confirm Password Field */}
                    <div className="form-group">
                        <label htmlFor="confirmPassword">
                            Confirm Password <span className="required">*</span>
                        </label>
                        <div className="input-wrapper">
                            <span className="input-icon"></span>
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
                                className="password-toggle"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                tabIndex="-1"
                            >
                                {showConfirmPassword ? '👁️' : '👁️‍🗨️'}
                            </button>
                        </div>
                        {errors.confirmPassword && (
                            <span className="error-message">{errors.confirmPassword}</span>
                        )}
                    </div>

                    {/* Terms and Conditions */}
                    <div className="form-group terms-group">
                        <label className="checkbox-label">
                            <input
                                type="checkbox"
                                checked={acceptedTerms}
                                onChange={(e) => setAcceptedTerms(e.target.checked)}
                                disabled={isLoading}
                            />
                            <span>
                                I accept the{' '}
                                <Link to="/terms" target="_blank">Terms of Service</Link>
                                {' '}and{' '}
                                <Link to="/privacy" target="_blank">Privacy Policy</Link>
                            </span>
                        </label>
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
                                Creating Account...
                            </>
                        ) : (
                            'Create Account'
                        )}
                    </button>
                </form>

                {/* Login Link */}
                <div className="auth-footer">
                    <p>
                        Already have an account?{' '}
                        <Link to="/login" className="auth-link">
                            Sign in
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Register;