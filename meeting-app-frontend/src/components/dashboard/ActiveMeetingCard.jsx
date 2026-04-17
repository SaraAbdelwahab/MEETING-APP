import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MdVideoCall, MdGroup, MdTimer, MdArrowForward, MdFiberManualRecord } from 'react-icons/md';
import Card, { CardHeader, CardBody } from '../ui/Card';
import Badge from '../ui/Badge';

const ActiveMeetingCard = ({ meetings = [] }) => {
    const navigate = useNavigate();
    const [now, setNow] = useState(new Date());

    // Tick every 30s to keep live status fresh
    useEffect(() => {
        const t = setInterval(() => setNow(new Date()), 30000);
        return () => clearInterval(t);
    }, []);

    const active = meetings.find(m => {
        const start = new Date(`${m.date}T${m.time}`);
        const end = new Date(start.getTime() + (m.duration || 60) * 60000);
        return now >= start && now <= end;
    });

    const next = meetings
        .filter(m => new Date(`${m.date}T${m.time}`) > now)
        .sort((a, b) => new Date(`${a.date}T${a.time}`) - new Date(`${b.date}T${b.time}`))[0];

    const meeting = active || next;

    if (!meeting) {
        return (
            <Card className="p-5 flex flex-col items-center justify-center min-h-[160px] text-center">
                <div className="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-3">
                    <MdVideoCall size={24} className="text-gray-400" />
                </div>
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">No Active Meeting</p>
                <p className="text-xs text-gray-400 mt-1">Your next meeting will appear here</p>
            </Card>
        );
    }

    const startTime = new Date(`${meeting.date}T${meeting.time}`);
    const isLive = !!active;
    const minutesUntil = Math.max(0, Math.round((startTime - now) / 60000));
    const elapsedMin = isLive ? Math.round((now - startTime) / 60000) : 0;

    return (
        <Card glow={isLive} className="overflow-hidden">
            {isLive && (
                <div className="bg-gradient-to-r from-blue-600 to-blue-500 px-5 py-2 flex items-center gap-2">
                    <MdFiberManualRecord size={12} className="text-white animate-pulse" />
                    <span className="text-white text-xs font-bold tracking-widest uppercase">Live Now</span>
                    <span className="ml-auto text-white/80 text-xs">{elapsedMin}m elapsed</span>
                </div>
            )}
            <CardHeader>
                <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${isLive ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-gray-100 dark:bg-gray-800'}`}>
                            <MdVideoCall size={22} className={isLive ? 'text-blue-600' : 'text-gray-500'} />
                        </div>
                        <div className="min-w-0">
                            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                                {isLive ? 'In Progress' : `Starts in ${minutesUntil < 60 ? `${minutesUntil}m` : `${Math.round(minutesUntil / 60)}h`}`}
                            </p>
                            <p className="font-bold text-gray-900 dark:text-white text-sm mt-0.5 truncate">{meeting.title}</p>
                        </div>
                    </div>
                    <Badge variant={isLive ? 'info' : 'neutral'} dot pulse={isLive}>
                        {isLive ? 'Live' : 'Soon'}
                    </Badge>
                </div>
            </CardHeader>
            <CardBody>
                <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400 mb-4">
                    <span className="flex items-center gap-1.5">
                        <MdTimer size={14} />
                        {startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {meeting.duration}m
                    </span>
                    <span className="flex items-center gap-1.5">
                        <MdGroup size={14} />
                        {meeting.participants?.length || 0} participants
                    </span>
                </div>
                <button
                    onClick={() => navigate(`/meeting/${meeting.id}`)}
                    className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-sm font-semibold rounded-xl transition-all duration-150 active:scale-95 shadow-sm shadow-blue-500/30"
                >
                    {isLive ? 'Join Now' : 'Open Room'}
                    <MdArrowForward size={16} />
                </button>
            </CardBody>
        </Card>
    );
};

export default ActiveMeetingCard;
