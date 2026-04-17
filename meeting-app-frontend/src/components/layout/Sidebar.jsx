import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
    MdDashboard, MdVideoCall, MdCalendarMonth, MdPlayCircle, 
    MdSecurity, MdSettings, MdLogout, MdLock
} from 'react-icons/md';
import './Sidebar.css';

const NAV_ITEMS = [
    { to: '/dashboard',  icon: MdDashboard,     label: 'Dashboard', description: 'Overview & stats' },
    { to: '/meetings',   icon: MdVideoCall,     label: 'Meetings', description: 'All meetings' },
    { to: '/calendar',   icon: MdCalendarMonth, label: 'Calendar', description: 'Schedule view' },
    { to: '/recordings', icon: MdPlayCircle,    label: 'Recordings', description: 'Saved videos' },
    { to: '/security',   icon: MdSecurity,      label: 'Security', description: 'Privacy & access' },
    { to: '/settings',   icon: MdSettings,      label: 'Settings', description: 'Preferences' },
];

const SidebarContent = ({ collapsed, onToggle, onClose, isMobile }) => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <aside className="premium-sidebar">
            {/* Logo */}
            <div className="sidebar-header">
                <div className="logo-container">
                    <div className="logo-icon">
                        <MdLock size={22} />
                    </div>
                    <div className="logo-text-container">
                        <span className="logo-text">SecureMeet</span>
                        <span className="logo-tagline">Enterprise Video</span>
                    </div>
                </div>
            </div>

            {/* Nav */}
            <nav className="sidebar-nav">
                {NAV_ITEMS.map(({ to, icon: Icon, label, description }) => (
                    <NavLink
                        key={to}
                        to={to}
                        onClick={isMobile ? onClose : undefined}
                        className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                        title={description}
                    >
                        <Icon size={20} />
                        <span className="nav-label">{label}</span>
                    </NavLink>
                ))}
            </nav>

            {/* User + Logout */}
            <div className="sidebar-footer">
                <div className="user-profile">
                    <div className="user-avatar">
                        {user?.username?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || 'U'}
                    </div>
                    <div className="user-info">
                        <div className="user-name">{user?.username || user?.name || 'User'}</div>
                        <div className="user-email">{user?.email}</div>
                    </div>
                </div>
                <button className="logout-btn" onClick={handleLogout} title="Logout">
                    <MdLogout size={18} />
                </button>
            </div>
        </aside>
    );
};

const Sidebar = ({ collapsed, onToggle, mobileOpen, onMobileClose }) => (
    <>
        {/* Desktop sidebar */}
        <div className={`sidebar-desktop ${mobileOpen ? 'mobile-open' : ''}`}>
            <SidebarContent collapsed={collapsed} onToggle={onToggle} isMobile={false} />
        </div>

        {/* Mobile overlay */}
        {mobileOpen && (
            <>
                <div className="mobile-overlay" onClick={onMobileClose} />
                <div className="sidebar-mobile">
                    <SidebarContent collapsed={false} onToggle={onToggle} onClose={onMobileClose} isMobile={true} />
                </div>
            </>
        )}
    </>
);

export default Sidebar;
