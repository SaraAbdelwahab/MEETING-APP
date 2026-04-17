import React, { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext(null);

export const useTheme = () => {
    const ctx = useContext(ThemeContext);
    if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
    return ctx;
};

// Initialize theme immediately to prevent flickering
const getInitialTheme = () => {
    try {
        const saved = localStorage.getItem('theme');
        if (saved === 'dark' || saved === 'light') {
            return saved === 'dark';
        }
    } catch (e) {
        console.warn('localStorage not available:', e);
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
};

// Apply theme class immediately before React renders
const applyThemeClass = (isDark) => {
    const root = document.documentElement;
    if (isDark) {
        root.classList.add('dark');
    } else {
        root.classList.remove('dark');
    }
};

export const ThemeProvider = ({ children }) => {
    const [isDark, setIsDark] = useState(() => {
        const initialTheme = getInitialTheme();
        // Apply theme immediately on mount
        applyThemeClass(initialTheme);
        return initialTheme;
    });

    useEffect(() => {
        // Apply theme class to root element
        applyThemeClass(isDark);
        
        // Persist to localStorage
        try {
            localStorage.setItem('theme', isDark ? 'dark' : 'light');
        } catch (e) {
            console.warn('Failed to save theme preference:', e);
        }
    }, [isDark]);

    const toggle = () => setIsDark(prev => !prev);

    return (
        <ThemeContext.Provider value={{ isDark, toggle }}>
            {children}
        </ThemeContext.Provider>
    );
};
