import React, { useState } from 'react';
import { MdLaptop, MdPhoneAndroid, MdTablet, MdSwapHoriz, MdWifi, MdWifiOff, MdSync, MdCheckCircle } from 'react-icons/md';
import Card, { CardHeader, CardBody } from '../ui/Card';
import Badge from '../ui/Badge';
import toast from 'react-hot-toast';

const DEVICE_ICONS = { laptop: MdLaptop, phone: MdPhoneAndroid, tablet: MdTablet };

const DeviceHandoffCard = () => {
    const [devices, setDevices] = useState([
        { id: 1, type: 'laptop', label: 'MacBook Pro',  role: 'primary', synced: true,  online: true,  lastSync: '1s ago'  },
        { id: 2, type: 'phone',  label: 'iPhone 15',    role: 'shadow',  synced: true,  online: true,  lastSync: '2s ago'  },
    ]);
    const [switching, setSwitching] = useState(null);

    const handleSwitch = async (deviceId) => {
        const target = devices.find(d => d.id === deviceId);
        if (!target || target.role === 'primary') return;

        setSwitching(deviceId);
        await new Promise(r => setTimeout(r, 1500));

        setDevices(prev => prev.map(d => ({
            ...d,
            role: d.id === deviceId ? 'primary' : d.role === 'primary' ? 'shadow' : d.role,
        })));
        setSwitching(null);
        toast.success(`Switched to ${target.label}`);
    };

    const primary = devices.find(d => d.role === 'primary');
    const shadows = devices.filter(d => d.role === 'shadow');

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                            <MdSwapHoriz size={22} className="text-blue-500" />
                        </div>
                        <div>
                            <p className="font-bold text-gray-900 dark:text-white text-sm">Device Handoff</p>
                            <p className="text-xs text-gray-400">Zero-friction failover</p>
                        </div>
                    </div>
                    <Badge variant="info">{devices.length} devices</Badge>
                </div>
            </CardHeader>
            <CardBody>
                <div className="space-y-2 mb-3">
                    {devices.map(d => {
                        const Icon = DEVICE_ICONS[d.type] || MdLaptop;
                        const isSwitching = switching === d.id;
                        return (
                            <div
                                key={d.id}
                                className={`
                                    flex items-center justify-between p-3 rounded-xl border transition-all duration-200
                                    ${d.role === 'primary'
                                        ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                                        : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                                    }
                                `}
                            >
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${d.role === 'primary' ? 'bg-blue-100 dark:bg-blue-900/40' : 'bg-gray-200 dark:bg-gray-700'}`}>
                                        <Icon size={18} className={d.role === 'primary' ? 'text-blue-600' : 'text-gray-500'} />
                                    </div>
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-1.5">
                                            <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{d.label}</p>
                                            {d.role === 'primary' && <Badge variant="info">Primary</Badge>}
                                        </div>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            {d.online
                                                ? <span className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400"><MdWifi size={11} />Online</span>
                                                : <span className="flex items-center gap-1 text-xs text-gray-400"><MdWifiOff size={11} />Offline</span>
                                            }
                                            {d.synced && <span className="flex items-center gap-1 text-xs text-gray-400"><MdSync size={11} />{d.lastSync}</span>}
                                        </div>
                                    </div>
                                </div>

                                {d.role === 'shadow' && d.online && (
                                    <button
                                        onClick={() => handleSwitch(d.id)}
                                        disabled={!!switching}
                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-semibold rounded-lg transition-all active:scale-95 disabled:opacity-50 flex-shrink-0"
                                    >
                                        {isSwitching ? <MdSync size={13} className="animate-spin" /> : <MdSwapHoriz size={13} />}
                                        {isSwitching ? 'Switching…' : 'Switch'}
                                    </button>
                                )}
                                {d.role === 'primary' && (
                                    <MdCheckCircle size={18} className="text-blue-500 flex-shrink-0" />
                                )}
                            </div>
                        );
                    })}
                </div>

                <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800 text-xs text-gray-500 dark:text-gray-400 space-y-1">
                    <p className="flex items-center gap-1.5"><MdSync size={12} className="text-blue-500" /> State syncs every 2s</p>
                    <p className="flex items-center gap-1.5"><MdSwapHoriz size={12} className="text-emerald-500" /> Failover in under 3 seconds</p>
                </div>
            </CardBody>
        </Card>
    );
};

export default DeviceHandoffCard;
