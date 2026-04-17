import React from 'react';
import { MdVideoCall, MdPersonAdd, MdSchedule, MdToday, MdNotifications } from 'react-icons/md';
import Card from '../ui/Card';

const CARDS = [
    {
        key: 'totalMeetings',
        icon: MdVideoCall,
        label: 'Total Meetings',
        color: 'text-blue-600 dark:text-blue-400',
        bg: 'bg-blue-50 dark:bg-blue-900/20',
        border: 'hover:border-blue-300 dark:hover:border-blue-700',
        tab: 'all',
    },
    {
        key: 'createdByMe',
        icon: MdPersonAdd,
        label: 'Created by Me',
        color: 'text-emerald-600 dark:text-emerald-400',
        bg: 'bg-emerald-50 dark:bg-emerald-900/20',
        border: 'hover:border-emerald-300 dark:hover:border-emerald-700',
        tab: 'created',
    },
    {
        key: 'upcomingMeetings',
        icon: MdSchedule,
        label: 'Upcoming',
        color: 'text-purple-600 dark:text-purple-400',
        bg: 'bg-purple-50 dark:bg-purple-900/20',
        border: 'hover:border-purple-300 dark:hover:border-purple-700',
        tab: 'upcoming',
    },
    {
        key: 'todayMeetings',
        icon: MdToday,
        label: "Today's",
        color: 'text-orange-600 dark:text-orange-400',
        bg: 'bg-orange-50 dark:bg-orange-900/20',
        border: 'hover:border-orange-300 dark:hover:border-orange-700',
        tab: 'all',
    },
    {
        key: 'pendingInvitations',
        icon: MdNotifications,
        label: 'Pending',
        color: 'text-red-600 dark:text-red-400',
        bg: 'bg-red-50 dark:bg-red-900/20',
        border: 'hover:border-red-300 dark:hover:border-red-700',
        tab: 'pending',
    },
];

const StatCards = ({ stats, onFilter }) => (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        {CARDS.map(({ key, icon: Icon, label, color, bg, border, tab }) => (
            <Card
                key={key}
                hover
                onClick={() => onFilter && onFilter(tab)}
                className={`p-4 group transition-all duration-200 ${border}`}
            >
                <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-200`}>
                    <Icon size={22} className={color} />
                </div>
                <p className="text-2xl font-extrabold text-gray-900 dark:text-white tabular-nums">
                    {stats?.[key] != null ? stats[key] : 0}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 font-medium">{label}</p>
            </Card>
        ))}
    </div>
);

export default StatCards;
