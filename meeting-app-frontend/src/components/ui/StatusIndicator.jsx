import React from 'react';
import { FiCheckCircle, FiAlertTriangle, FiXCircle, FiLoader } from 'react-icons/fi';

const CONFIG = {
    verified: { icon: FiCheckCircle,   color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-900/20', label: 'Verified' },
    warning:  { icon: FiAlertTriangle, color: 'text-amber-500',   bg: 'bg-amber-50 dark:bg-amber-900/20',     label: 'Warning'  },
    error:    { icon: FiXCircle,       color: 'text-red-500',     bg: 'bg-red-50 dark:bg-red-900/20',         label: 'Error'    },
    loading:  { icon: FiLoader,        color: 'text-blue-500',    bg: 'bg-blue-50 dark:bg-blue-900/20',       label: 'Checking' },
};

const SIZES = { sm: 13, md: 16, lg: 20 };

const StatusIndicator = ({ status = 'loading', label, size = 'md' }) => {
    const cfg = CONFIG[status] || CONFIG.loading;
    const Icon = cfg.icon;
    const sz = SIZES[size];

    return (
        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg ${cfg.bg}`}>
            <Icon size={sz} className={`${cfg.color} ${status === 'loading' ? 'animate-spin' : ''}`} />
            <span className={`text-xs font-semibold ${cfg.color}`}>{label || cfg.label}</span>
        </div>
    );
};

export default StatusIndicator;
