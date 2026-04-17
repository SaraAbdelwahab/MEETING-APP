import React, { useState } from 'react';
import { MdSecurity, MdRefresh, MdFingerprint, MdPhoneAndroid } from 'react-icons/md';
import { FiKey, FiShield } from 'react-icons/fi';
import Card, { CardHeader, CardBody } from '../ui/Card';
import StatusIndicator from '../ui/StatusIndicator';
import Badge from '../ui/Badge';

const SecurityRow = ({ icon: Icon, label, status, detail, onAction, actionLabel }) => (
    <div className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-800 last:border-0">
        <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
                <Icon size={16} className="text-gray-500 dark:text-gray-400" />
            </div>
            <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{label}</p>
                {detail && <p className="text-xs text-gray-400 truncate">{detail}</p>}
            </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
            {onAction && (
                <button
                    onClick={onAction}
                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium px-2 py-1 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                >
                    {actionLabel}
                </button>
            )}
            <StatusIndicator status={status} size="sm" />
        </div>
    </div>
);

const SecurityStatusCard = () => {
    const [keyStatus, setKeyStatus] = useState('verified');
    const [rotating, setRotating] = useState(false);
    const [sessionId] = useState('a3f9b2c1-d4e5');

    const handleRotate = async () => {
        setRotating(true);
        setKeyStatus('loading');
        // Simulate key rotation
        await new Promise(r => setTimeout(r, 1500));
        setKeyStatus('verified');
        setRotating(false);
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center">
                            <FiShield size={20} className="text-emerald-500" />
                        </div>
                        <div>
                            <p className="font-bold text-gray-900 dark:text-white text-sm">Security Status</p>
                            <p className="text-xs text-gray-400">Enterprise grade</p>
                        </div>
                    </div>
                    <Badge variant="success" dot pulse>Secure</Badge>
                </div>
            </CardHeader>
            <CardBody>
                <SecurityRow
                    icon={FiKey}
                    label="Hybrid Key Exchange"
                    status={keyStatus}
                    detail={`Session ${sessionId} · X25519 + ML-KEM-768`}
                    onAction={handleRotate}
                    actionLabel={rotating ? 'Rotating…' : 'Rotate'}
                />
                <SecurityRow
                    icon={MdRefresh}
                    label="Key Rotation"
                    status="verified"
                    detail="Auto every 30 minutes"
                />
                <SecurityRow
                    icon={MdFingerprint}
                    label="Device Binding"
                    status="verified"
                    detail="Fingerprint locked to session"
                />
                <SecurityRow
                    icon={MdSecurity}
                    label="Signaling Encryption"
                    status="verified"
                    detail="AES-256-GCM end-to-end"
                />
                <SecurityRow
                    icon={MdPhoneAndroid}
                    label="Session Integrity"
                    status="verified"
                    detail="Append-only audit log active"
                />
            </CardBody>
        </Card>
    );
};

export default SecurityStatusCard;
