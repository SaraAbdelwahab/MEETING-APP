import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { MdSettings, MdPerson, MdDarkMode, MdLightMode, MdNotifications, MdSecurity } from 'react-icons/md';

const SettingsPage = () => {
    const { user } = useAuth();
    const { isDark, toggle } = useTheme();

    return (
        <>
            <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-gray-500 to-gray-700 flex items-center justify-center">
                    <MdSettings size={24} className="text-white" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Manage your account preferences</p>
                </div>
            </div>

            <div className="space-y-4">
                {/* Profile Section */}
                <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                            <MdPerson size={20} className="text-blue-500" />
                        </div>
                        <h3 className="font-semibold text-gray-900 dark:text-white">Profile</h3>
                    </div>
                    <div className="space-y-3">
                        <div>
                            <label className="text-xs text-gray-500 dark:text-gray-400">Name</label>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">{user?.name || 'Not set'}</p>
                        </div>
                        <div>
                            <label className="text-xs text-gray-500 dark:text-gray-400">Email</label>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">{user?.email}</p>
                        </div>
                    </div>
                </div>

                {/* Appearance Section */}
                <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center">
                            {isDark ? (
                                <MdDarkMode size={20} className="text-purple-500" />
                            ) : (
                                <MdLightMode size={20} className="text-purple-500" />
                            )}
                        </div>
                        <h3 className="font-semibold text-gray-900 dark:text-white">Appearance</h3>
                    </div>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">Theme</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                Current: {isDark ? 'Dark' : 'Light'} mode
                            </p>
                        </div>
                        <button
                            onClick={toggle}
                            className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-all active:scale-95"
                        >
                            {isDark ? (
                                <>
                                    <MdLightMode size={18} />
                                    <span className="text-sm font-medium">Light</span>
                                </>
                            ) : (
                                <>
                                    <MdDarkMode size={18} />
                                    <span className="text-sm font-medium">Dark</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {/* Notifications Section */}
                <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-xl bg-green-50 dark:bg-green-900/20 flex items-center justify-center">
                            <MdNotifications size={20} className="text-green-500" />
                        </div>
                        <h3 className="font-semibold text-gray-900 dark:text-white">Notifications</h3>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Notification preferences coming soon
                    </p>
                </div>

                {/* Security Section */}
                <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
                            <MdSecurity size={20} className="text-red-500" />
                        </div>
                        <h3 className="font-semibold text-gray-900 dark:text-white">Security</h3>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Advanced security settings available in Security page
                    </p>
                </div>
            </div>
        </>
    );
};

export default SettingsPage;
