import React, { useState, useEffect } from 'react';
import { MdSecurity, MdVerifiedUser, MdLock, MdFingerprint, MdDevices, MdHistory, MdShield } from 'react-icons/md';
import { FiLoader } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';

const SecurityPage = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [settings, setSettings] = useState({
        twoFactorEnabled: false,
        deviceBindingEnabled: true,
        endToEndEncryption: true,
        recordingVerification: true,
        biometricAuth: false,
        sessionTimeout: 30
    });

    const [sessions, setSessions] = useState([
        {
            id: 1,
            device: 'Chrome on Windows',
            location: 'Current Session',
            lastActive: new Date(),
            current: true
        }
    ]);

    const toggleSetting = (key) => {
        setSettings(prev => ({
            ...prev,
            [key]: !prev[key]
        }));
    };

    const handleSessionTimeout = (minutes) => {
        setSettings(prev => ({
            ...prev,
            sessionTimeout: minutes
        }));
    };

    const revokeSession = (sessionId) => {
        if (window.confirm('Revoke this session?')) {
            setSessions(prev => prev.filter(s => s.id !== sessionId));
        }
    };

    return (
        <>
            <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-500 to-red-700 flex items-center justify-center">
                    <MdSecurity size={24} className="text-white" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Security</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Manage your security settings</p>
                </div>
            </div>

            <div className="space-y-4">
                {/* Authentication */}
                <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                            <MdVerifiedUser size={20} className="text-blue-500" />
                        </div>
                        <div className="flex-1">
                            <h3 className="font-semibold text-gray-900 dark:text-white">Authentication</h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Secure your account access</p>
                        </div>
                    </div>
                    <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
                            <div className="flex items-center gap-3">
                                <MdFingerprint size={18} className="text-gray-500" />
                                <div>
                                    <p className="text-sm font-medium text-gray-900 dark:text-white">Biometric Authentication</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">Use fingerprint or face recognition</p>
                                </div>
                            </div>
                            <button
                                onClick={() => toggleSetting('biometricAuth')}
                                className={`w-12 h-6 rounded-full transition-colors ${
                                    settings.biometricAuth ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
                                }`}
                            >
                                <div className={`w-5 h-5 rounded-full bg-white transition-transform ${
                                    settings.biometricAuth ? 'translate-x-6' : 'translate-x-0.5'
                                }`} />
                            </button>
                        </div>
                        <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
                            <div className="flex items-center gap-3">
                                <MdShield size={18} className="text-gray-500" />
                                <div>
                                    <p className="text-sm font-medium text-gray-900 dark:text-white">Two-Factor Authentication</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">Add an extra layer of security</p>
                                </div>
                            </div>
                            <button
                                onClick={() => toggleSetting('twoFactorEnabled')}
                                className={`w-12 h-6 rounded-full transition-colors ${
                                    settings.twoFactorEnabled ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
                                }`}
                            >
                                <div className={`w-5 h-5 rounded-full bg-white transition-transform ${
                                    settings.twoFactorEnabled ? 'translate-x-6' : 'translate-x-0.5'
                                }`} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Encryption */}
                <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center">
                            <MdLock size={20} className="text-purple-500" />
                        </div>
                        <div className="flex-1">
                            <h3 className="font-semibold text-gray-900 dark:text-white">Encryption</h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Protect your communications</p>
                        </div>
                    </div>
                    <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
                            <div>
                                <p className="text-sm font-medium text-gray-900 dark:text-white">End-to-End Encryption</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Quantum-resistant encryption for all meetings</p>
                            </div>
                            <button
                                onClick={() => toggleSetting('endToEndEncryption')}
                                className={`w-12 h-6 rounded-full transition-colors ${
                                    settings.endToEndEncryption ? 'bg-purple-600' : 'bg-gray-300 dark:bg-gray-600'
                                }`}
                            >
                                <div className={`w-5 h-5 rounded-full bg-white transition-transform ${
                                    settings.endToEndEncryption ? 'translate-x-6' : 'translate-x-0.5'
                                }`} />
                            </button>
                        </div>
                        <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
                            <div>
                                <p className="text-sm font-medium text-gray-900 dark:text-white">Recording Verification</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">C2PA-compliant tamper detection</p>
                            </div>
                            <button
                                onClick={() => toggleSetting('recordingVerification')}
                                className={`w-12 h-6 rounded-full transition-colors ${
                                    settings.recordingVerification ? 'bg-purple-600' : 'bg-gray-300 dark:bg-gray-600'
                                }`}
                            >
                                <div className={`w-5 h-5 rounded-full bg-white transition-transform ${
                                    settings.recordingVerification ? 'translate-x-6' : 'translate-x-0.5'
                                }`} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Device Management */}
                <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-xl bg-green-50 dark:bg-green-900/20 flex items-center justify-center">
                            <MdDevices size={20} className="text-green-500" />
                        </div>
                        <div className="flex-1">
                            <h3 className="font-semibold text-gray-900 dark:text-white">Device Management</h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Manage trusted devices</p>
                        </div>
                    </div>
                    <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
                            <div>
                                <p className="text-sm font-medium text-gray-900 dark:text-white">Device Binding</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Secure device authentication</p>
                            </div>
                            <button
                                onClick={() => toggleSetting('deviceBindingEnabled')}
                                className={`w-12 h-6 rounded-full transition-colors ${
                                    settings.deviceBindingEnabled ? 'bg-green-600' : 'bg-gray-300 dark:bg-gray-600'
                                }`}
                            >
                                <div className={`w-5 h-5 rounded-full bg-white transition-transform ${
                                    settings.deviceBindingEnabled ? 'translate-x-6' : 'translate-x-0.5'
                                }`} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Active Sessions */}
                <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-xl bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center">
                            <MdHistory size={20} className="text-orange-500" />
                        </div>
                        <div className="flex-1">
                            <h3 className="font-semibold text-gray-900 dark:text-white">Active Sessions</h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Manage your login sessions</p>
                        </div>
                    </div>
                    <div className="space-y-2">
                        {sessions.map(session => (
                            <div key={session.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
                                <div>
                                    <p className="text-sm font-medium text-gray-900 dark:text-white">{session.device}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                        {session.location} • {session.lastActive.toLocaleString()}
                                    </p>
                                </div>
                                {!session.current && (
                                    <button
                                        onClick={() => revokeSession(session.id)}
                                        className="px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                    >
                                        Revoke
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </>
    );
};

export default SecurityPage;
