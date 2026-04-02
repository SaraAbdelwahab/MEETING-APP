/**
 * Validation utilities for forms
 */

// Email validation regex
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Password strength regex (min 6 chars, at least 1 letter and 1 number)
const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{6,}$/;

/**
 * Validate email format
 * @param {string} email
 * @returns {boolean}
 */
export const isValidEmail = (email) => {
    return emailRegex.test(email);
};

/**
 * Validate password strength
 * @param {string} password
 * @returns {boolean}
 */
export const isStrongPassword = (password) => {
    return passwordRegex.test(password);
};

/**
 * Validate registration form
 * @param {Object} data - { name, email, password, confirmPassword }
 * @returns {Object} - { isValid, errors }
 */
export const validateRegister = (data) => {
    const errors = {};

    // Name validation
    if (!data.name?.trim()) {
        errors.name = 'Name is required';
    } else if (data.name.length < 2) {
        errors.name = 'Name must be at least 2 characters';
    }

    // Email validation
    if (!data.email) {
        errors.email = 'Email is required';
    } else if (!isValidEmail(data.email)) {
        errors.email = 'Please enter a valid email';
    }

    // Password validation
    if (!data.password) {
        errors.password = 'Password is required';
    } else if (data.password.length < 6) {
        errors.password = 'Password must be at least 6 characters';
    } else if (!isStrongPassword(data.password)) {
        errors.password = 'Password must contain at least one letter and one number';
    }

    // Confirm password validation
    if (!data.confirmPassword) {
        errors.confirmPassword = 'Please confirm your password';
    } else if (data.password !== data.confirmPassword) {
        errors.confirmPassword = 'Passwords do not match';
    }

    return {
        isValid: Object.keys(errors).length === 0,
        errors
    };
};

/**
 * Validate login form
 * @param {Object} data - { email, password }
 * @returns {Object} - { isValid, errors }
 */
export const validateLogin = (data) => {
    const errors = {};

    if (!data.email) {
        errors.email = 'Email is required';
    } else if (!isValidEmail(data.email)) {
        errors.email = 'Please enter a valid email';
    }

    if (!data.password) {
        errors.password = 'Password is required';
    }

    return {
        isValid: Object.keys(errors).length === 0,
        errors
    };
};