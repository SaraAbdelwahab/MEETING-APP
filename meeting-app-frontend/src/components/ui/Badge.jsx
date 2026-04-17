import React from 'react';

const VARIANTS = {
    success: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800',
    warning: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800',
    error:   'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800',
    info:    'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800',
    neutral: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700',
    purple:  'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 border border-purple-200 dark:border-purple-800',
    teal:    'bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 border border-teal-200 dark:border-teal-800',
};

const DOT_COLORS = {
    success: 'bg-emerald-500', warning: 'bg-amber-500',
    error: 'bg-red-500', info: 'bg-blue-500',
    neutral: 'bg-gray-400', purple: 'bg-purple-500', teal: 'bg-teal-500',
};

const Badge = ({ variant = 'neutral', children, dot = false, pulse = false, className = '' }) => (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold ${VARIANTS[variant]} ${className}`}>
        {dot && (
            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${DOT_COLORS[variant]} ${pulse ? 'animate-pulse' : ''}`} />
        )}
        {children}
    </span>
);

export default Badge;
