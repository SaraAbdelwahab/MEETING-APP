import React from 'react';

const Card = ({ children, className = '', onClick, hover = false, glow = false }) => (
    <div
        onClick={onClick}
        className={`
            bg-white dark:bg-gray-900
            border border-gray-200 dark:border-gray-800
            rounded-2xl shadow-sm
            ${hover ? 'hover:shadow-lg hover:-translate-y-0.5 hover:border-blue-200 dark:hover:border-blue-800 transition-all duration-200 cursor-pointer' : ''}
            ${glow ? 'ring-2 ring-blue-500/20 dark:ring-blue-400/20' : ''}
            ${className}
        `}
    >
        {children}
    </div>
);

export const CardHeader = ({ children, className = '' }) => (
    <div className={`px-5 pt-5 pb-3 ${className}`}>{children}</div>
);

export const CardBody = ({ children, className = '' }) => (
    <div className={`px-5 pb-5 ${className}`}>{children}</div>
);

export default Card;
