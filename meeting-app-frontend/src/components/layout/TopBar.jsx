import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import {
    MdSearch, MdNotifications, MdLightMode, MdDarkMode,
    MdAdd, MdExpandMore, MdMenu, MdCheckCircle, MdInfo,
    MdWarning, MdLogout, MdPerson, MdSettings
} from 'react-icons/md';
import { FiShield } from 'react-icons/fi';

const NOTIF_ICONS = {
    success: { icon: MdCheckCircle, color: 'text-emerald-500' },
    info:    { icon: MdInfo,        color: 'text-blue-500'    },
    warning: { icon: MdWarning,     color: 'text-amber-500'   },
};

const TopBar = ({ onMenuClick }) => {
    const { user, logout } = useAuth();
    const { isDark, toggle } = useTheme();
    const navigate = useNavigate();
    const [search, setSearch] = useState('');
    const [showNotif, setShowNotif] = useState(false);
    const [showProfile, setShowProfile] = useState(false);
    const [notifications, setNotifications] = useState([
        { id: 1, text: 'Session key rotated successfully', time: '2m ago', type: 'success', read: false },
        { id: 2, text: 'Identity verified — presence check passed', time: '5m ago', type: 'success', read: false },
        { id: 3, text: 'New meeting invitation from Alex', time: '12m ago', type: 'info', read: true },
        { id: 4, text: 'Recording integrity verified', time: '1h ago', type: 'success', read: true },
    ]);

    const notifRef = useRef(null);
    const profileRef = useRef(null);
    const unreadCount = notifications.filter(n => !n.read).length;

    // Close dropdowns on outside click
    useEffect(() => {
        const handler = (e) => {
            if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotif(false);
            if (profileRef.current && !profileRef.current.contains(e.target)) setShowProfile(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const markAllRead = () => setNotifications(prev => prev.map(n => ({ ...n, read: true })));

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <header className="h-16 flex items-center justify-between px-4 sm:px-6 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 flex-shrink-0 z-30">
            {/* Left: hamburger (mobile) + search */}
            <div className="flex items-center gap-3 flex-1 min-w-0">
                <button
                    onClick={onMenuClick}
                    className="md:hidden w-9 h-9 flex items-center justify-center rounded-xl text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex-shrink-0"
                >
                    <MdMenu size={22} />
                </button>

                <div className="relative flex-1 max-w-xs sm:max-w-sm">
                    <MdSearch size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    <input
                        type="text"
                        placeholder="Search meetings..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 text-sm rounded-xl bg-gray-100 dark:bg-gray-800 border border-transparent focus:border-blue-500 focus:bg-white dark:focus:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 outline-none transition-all"
                    />
                </div>
            </div>

            {/* Right: actions */}
            <div className="flex items-center gap-1.5 ml-3 flex-shrink-0">
                {/* New Meeting */}
                <button
                    onClick={() => navigate('/create-meeting')}
                    className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-sm font-semibold rounded-xl transition-all duration-150 active:scale-95 shadow-sm shadow-blue-500/30"
                >
                    <MdAdd size={18} />
                    <span className="hidden sm:inline">New Meeting</span>
                </button>

                {/* Theme toggle */}
                <button
                    onClick={toggle}
                    className="w-9 h-9 flex items-center justify-center rounded-xl text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all active:scale-95"
                    title={isDark ? 'Light mode' : 'Dark mode'}
                >
                    {isDark ? <MdLightMode size={19} /> : <MdDarkMode size={19} />}
                </button>

                {/* Notifications */}
                <div className="relative" ref={notifRef}>
                    <button
                        onClick={() => { setShowNotif(v => !v); setShowProfile(false); }}
                        className="relative w-9 h-9 flex items-center justify-center rounded-xl text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all active:scale-95"
                    >
                        <MdNotifications size={20} />
                        {unreadCount > 0 && (
                            <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                                {unreadCount}
                            </span>
                        )}
                    </button>

                    {showNotif && (
                        <div className="absolute right-0 top-11 w-80 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 z-50 overflow-hidden animate-in">
                            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
                                <p className="text-sm font-bold text-gray-900 dark:text-white">Notifications</p>
                                {unreadCount > 0 && (
                                    <button onClick={markAllRead} className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium">
                                        Mark all read
                                    </button>
                                )}
                            </div>
                            <div className="max-h-72 overflow-y-auto">
                                {notifications.map(n => {
                                    const { icon: NIcon, color } = NOTIF_ICONS[n.type] || NOTIF_ICONS.info;
                                    return (
                                        <div
                                            key={n.id}
                                            onClick={() => setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, read: true } : x))}
                                            className={`flex items-start gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer ${!n.read ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}
                                        >
                                            <NIcon size={16} className={`${color} mt-0.5 flex-shrink-0`} />
                                            <div className="flex-1 min-w-0">
                                                <p className={`text-xs ${!n.read ? 'font-semibold text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-300'}`}>{n.text}</p>
                                                <p className="text-xs text-gray-400 mt-0.5">{n.time}</p>
                                            </div>
                                            {!n.read && <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mt-1" />}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                {/* Profile dropdown */}
                <div className="relative" ref={profileRef}>
                    <button
                        onClick={() => { setShowProfile(v => !v); setShowNotif(false); }}
                        className="flex items-center gap-2 pl-1.5 pr-2 py-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-all active:scale-95"
                    >
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                            {user?.name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || 'U'}
                        </div>
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 hidden sm:inline max-w-[80px] truncate">
                            {user?.name || user?.email?.split('@')[0] || 'User'}
                        </span>
                        <MdExpandMore size={16} className="text-gray-400 hidden sm:block" />
                    </button>

                    {showProfile && (
                        <div className="absolute right-0 top-11 w-52 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 z-50 overflow-hidden">
                            <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
                                <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{user?.name || 'User'}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user?.email}</p>
                            </div>
                            {[
                                { icon: MdPerson,   label: 'Profile',  action: () => {} },
                                { icon: FiShield,   label: 'Security', action: () => navigate('/security') },
                                { icon: MdSettings, label: 'Settings', action: () => navigate('/settings') },
                            ].map(({ icon: Icon, label, action }) => (
                                <button key={label} onClick={() => { action(); setShowProfile(false); }}
                                    className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                                    <Icon size={16} className="text-gray-400" />
                                    {label}
                                </button>
                            ))}
                            <div className="border-t border-gray-100 dark:border-gray-800">
                                <button onClick={handleLogout}
                                    className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                                    <MdLogout size={16} />
                                    Logout
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
};

export default TopBar;
