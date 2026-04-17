import React, { useState, useEffect } from 'react';
import { MdFace, MdCheckCircle, MdWarning, MdTimer, MdRefresh, MdLock } from 'react-icons/md';
import { FiAlertTriangle } from 'react-icons/fi';
import Card, { CardHeader, CardBody } from '../ui/Card';
import Badge from '../ui/Badge';
import StatusIndicator from '../ui/StatusIndicator';

const IdentityCard = () => {
    const [enrollmentStatus, setEnrollmentStatus] = useState('enrolled');
    const [presenceStatus, setPresenceStatus] = useState('present');
    const [lastCheck, setLastCheck] = useState(new Date(Date.now() - 45000));
    const [checking, setChecking] = useState(false);
    const [timeLabel, setTimeLabel] = useState('');

    // Update time label every 10s
    useEffect(() => {
        const update = () => {
            const s = Math.round((Date.now() - lastCheck.getTime()) / 1000);
            setTimeLabel(s < 60 ? `${s}s ago` : `${Math.round(s / 60)}m ago`);
        };
        update();
        const t = setInterval(update, 10000);
        return () => clearInterval(t);
    }, [lastCheck]);

    const handleManualCheck = async () => {
        setChecking(true);
        setPresenceStatus('checking');
        await new Promise(r => setTimeout(r, 2000));
        setPresenceStatus('present');
        setLastCheck(new Date());
        setChecking(false);
    };

    const presenceCfg = {
        present:   { variant: 'success', label: 'Present',   indicator: 'verified' },
        absent:    { variant: 'error',   label: 'Absent',    indicator: 'error'    },
        checking:  { variant: 'info',    label: 'Checking',  indicator: 'loading'  },
        challenge: { variant: 'warning', label: 'Challenge', indicator: 'warning'  },
    }[presenceStatus] || { variant: 'neutral', label: 'Unknown', indicator: 'loading' };

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center">
                            <MdFace size={22} className="text-purple-500" />
                        </div>
                        <div>
                            <p className="font-bold text-gray-900 dark:text-white text-sm">Identity Verification</p>
                            <p className="text-xs text-gray-400">On-device biometrics</p>
                        </div>
                    </div>
                    <Badge variant={presenceCfg.variant} dot pulse={presenceStatus === 'present'}>
                        {presenceCfg.label}
                    </Badge>
                </div>
            </CardHeader>
            <CardBody>
                {/* Enrollment row */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-800 mb-2">
                    <div className="flex items-center gap-2.5">
                        <MdCheckCircle size={17} className={enrollmentStatus === 'enrolled' ? 'text-emerald-500' : 'text-gray-400'} />
                        <div>
                            <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">Biometric Enrolled</p>
                            <p className="text-xs text-gray-400">Template stored on-device only</p>
                        </div>
                    </div>
                    <Badge variant={enrollmentStatus === 'enrolled' ? 'success' : 'neutral'}>
                        {enrollmentStatus === 'enrolled' ? 'Active' : 'Not set'}
                    </Badge>
                </div>

                {/* Presence row */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-800 mb-2">
                    <div className="flex items-center gap-2.5">
                        <MdTimer size={17} className="text-gray-400" />
                        <div>
                            <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">Last Presence Check</p>
                            <p className="text-xs text-gray-400">{timeLabel}</p>
                        </div>
                    </div>
                    <StatusIndicator status={presenceCfg.indicator} size="sm" />
                </div>

                {/* Private key row */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-800 mb-3">
                    <div className="flex items-center gap-2.5">
                        <MdLock size={17} className="text-gray-400" />
                        <div>
                            <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">Device Private Key</p>
                            <p className="text-xs text-gray-400">Non-extractable · ECDSA P-256</p>
                        </div>
                    </div>
                    <Badge variant="success">Secured</Badge>
                </div>

                {/* Manual check button */}
                <button
                    onClick={handleManualCheck}
                    disabled={checking}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <MdRefresh size={16} className={checking ? 'animate-spin' : ''} />
                    {checking ? 'Verifying…' : 'Run Presence Check'}
                </button>

                <p className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1.5 mt-3">
                    <FiAlertTriangle size={11} />
                    Raw biometric data never leaves your device
                </p>
            </CardBody>
        </Card>
    );
};

export default IdentityCard;
