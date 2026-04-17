import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MdCalendarToday, MdArrowForward, MdFiberManualRecord } from 'react-icons/md';
import Card, { CardHeader, CardBody } from '../ui/Card';
import Badge from '../ui/Badge';

const TodayMeetingsCard = ({ meetings = [] }) => {
    const navigate = useNavigate();
    const [now, setNow] = useState(new Date());
    useEffect(() => {
        const t = setInterval(() => setNow(new Date()), 60000);
        return () => clearInterval(t);
    }, []);

    const today = now.toISOString().split('T')[0];
    const todayMeetings = meetings
        .filter(m => m.date === today)
        .sort((a, b) => a.time.localeCompare(b.time));

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center">
                            <MdCalendarToday size={20} className="text-orange-500" />
                        </div>
                        <div>
                            <p className="font-bold text-gray-900 dark:text-white text-sm">Today's Schedule</p>
                            <p className="text-xs text-gray-400">{now.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })}</p>
                        </div>
                    </div>
                    <Badge variant={todayMeetings.length > 0 ? 'warning' : 'neutral'}>
                        {todayMeetings.length} meeting{todayMeetings.length !== 1 ? 's' : ''}
                    </Badge>
                </div>
            </CardHeader>
            <CardBody>
                {todayMeetings.length === 0 ? (
                    <div className="text-center py-6">
                        <p className="text-sm text-gray-400">No meetings scheduled today</p>
                        <p className="text-xs text-gray-300 dark:text-gray-600 mt-1">Enjoy your free day!</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {todayMeetings.slice(0, 4).map(m => {
                            const start = new Date(`${m.date}T${m.time}`);
                            const end = new Date(start.getTime() + m.duration * 60000);
                            const isLive = now >= start && now <= end;
                            const isPast = end < now;
                            return (
                                <button
                                    key={m.id}
                                    onClick={() => navigate(`/meetings/${m.id}`)}
                                    className={`
                                        w-full flex items-center justify-between p-3 rounded-xl
                                        transition-all duration-150 active:scale-[0.98] text-left
                                        ${isLive
                                            ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800'
                                            : isPast
                                                ? 'bg-gray-50 dark:bg-gray-800/50 opacity-60'
                                                : 'bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700'
                                        }
                                    `}
                                >
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className={`w-1.5 h-8 rounded-full flex-shrink-0 ${isLive ? 'bg-blue-500' : isPast ? 'bg-gray-300 dark:bg-gray-600' : 'bg-gray-300 dark:bg-gray-600'}`} />
                                        <div className="min-w-0">
                                            <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{m.title}</p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                                {start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} – {end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                        {isLive && (
                                            <span className="flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-400">
                                                <MdFiberManualRecord size={10} className="animate-pulse" />
                                                Live
                                            </span>
                                        )}
                                        <MdArrowForward size={15} className="text-gray-400" />
                                    </div>
                                </button>
                            );
                        })}
                        {todayMeetings.length > 4 && (
                            <p className="text-xs text-center text-gray-400 pt-1">+{todayMeetings.length - 4} more</p>
                        )}
                    </div>
                )}
            </CardBody>
        </Card>
    );
};

export default TodayMeetingsCard;
