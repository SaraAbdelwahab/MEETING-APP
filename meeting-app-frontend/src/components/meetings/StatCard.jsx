import React from 'react';
import './StatCard.css';

const StatCard = ({ icon, title, value, color, trend, onClick }) => {
    return (
        <div className="stat-card" onClick={onClick} style={{ cursor: onClick ? 'pointer' : 'default' }}>
            <div className="stat-icon" style={{ backgroundColor: color + '20', color: color }}>
                {icon}
            </div>
            <div className="stat-content">
                <h3 className="stat-title">{title}</h3>
                <div className="stat-value">{value}</div>
                {trend && (
                    <div className="stat-trend" style={{ color: trend > 0 ? '#4caf50' : '#f44336' }}>
                        {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}%
                    </div>
                )}
            </div>
        </div>
    );
};

export default StatCard;