import React, { useState } from 'react';
import { MdSecurity, MdFace, MdSwapHoriz, MdRefresh, MdPlayCircle, MdExpandMore, MdExpandLess } from 'react-icons/md';
import { FiKey } from 'react-icons/fi';
import Card, { CardHeader, CardBody } from '../ui/Card';

const INITIAL_ACTIVITY = [
    { id: 1, icon: FiKey,        text: 'Session key rotated',              time: '2m ago',  color: 'text-blue-500',   bg: 'bg-blue-50 dark:bg-blue-900/20',    type: 'security' },
    { id: 2, icon: MdFace,       text: 'Presence check passed',            time: '5m ago',  color: 'text-emerald-500',bg: 'bg-emerald-50 dark:bg-emerald-900/20', type: 'identity' },
    { id: 3, icon: MdSecurity,   text: 'Device fingerprint verified',      time: '8m ago',  color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-900/20', type: 'security' },
    { id: 4, icon: MdSwapHoriz,  text: 'Shadow session synced',            time: '10m ago', color: 'text-orange-500', bg: 'bg-orange-50 dark:bg-orange-900/20', type: 'handoff'  },
    { id: 5, icon: MdPlayCircle, text: 'Merkle root stored for recording', time: '1h ago',  color: 'text-teal-500',   bg: 'bg-teal-50 dark:bg-teal-900/20',    type: 'integrity'},
    { id: 6, icon: MdRefresh,    text: 'Key rotation scheduled',           time: '1h ago',  color: 'text-blue-500',   bg: 'bg-blue-50 dark:bg-blue-900/20',    type: 'security' },
    { id: 7, icon: MdFace,       text: 'Biometric enrollment confirmed',   time: '2h ago',  color: 'text-emerald-500',bg: 'bg-emerald-50 dark:bg-emerald-900/20', type: 'identity' },
];

const TYPE_FILTERS = ['all', 'security', 'identity', 'handoff', 'integrity'];

const ActivityCard = () => {
    const [filter, setFilter] = useState('all');
    const [expanded, setExpanded] = useState(false);

    const filtered = INITIAL_ACTIVITY.filter(a => filter === 'all' || a.type === filter);
    const visible = expanded ? filtered : filtered.slice(0, 4);

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                            <MdSecurity size={20} className="text-gray-500" />
                        </div>
                        <p className="font-bold text-gray-900 dark:text-white text-sm">Audit Activity</p>
                    </div>
                    <span className="text-xs text-gray-400">{filtered.length} events</span>
                </div>
                {/* Filter pills */}
                <div className="flex gap-1 flex-wrap">
                    {TYPE_FILTERS.map(f => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize transition-all active:scale-95 ${
                                filter === f
                                    ? 'bg-blue-600 text-white shadow-sm'
                                    : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                            }`}
                        >
                            {f}
                        </button>
                    ))}
                </div>
            </CardHeader>
            <CardBody>
                <div className="space-y-2.5">
                    {visible.length === 0 ? (
                        <p className="text-sm text-gray-400 text-center py-4">No activity in this category</p>
                    ) : (
                        visible.map(item => {
                            const Icon = item.icon;
                            return (
                                <div key={item.id} className="flex items-center gap-3 group">
                                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${item.bg} group-hover:scale-110 transition-transform duration-150`}>
                                        <Icon size={15} className={item.color} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm text-gray-700 dark:text-gray-300 truncate">{item.text}</p>
                                    </div>
                                    <span className="text-xs text-gray-400 flex-shrink-0 tabular-nums">{item.time}</span>
                                </div>
                            );
                        })
                    )}
                </div>

                {filtered.length > 4 && (
                    <button
                        onClick={() => setExpanded(v => !v)}
                        className="w-full flex items-center justify-center gap-1.5 mt-4 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                    >
                        {expanded ? <><MdExpandLess size={16} />Show less</> : <><MdExpandMore size={16} />Show {filtered.length - 4} more</>}
                    </button>
                )}
            </CardBody>
        </Card>
    );
};

export default ActivityCard;
