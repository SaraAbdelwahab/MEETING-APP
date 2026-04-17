import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MdCalendarMonth, MdChevronLeft, MdChevronRight, MdVideoCall } from 'react-icons/md';
import Card, { CardHeader, CardBody } from '../ui/Card';

const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

const CalendarCard = ({ meetings = [] }) => {
    const navigate = useNavigate();
    const today = new Date();
    const [current, setCurrent] = useState({ year: today.getFullYear(), month: today.getMonth() });
    const [selectedDay, setSelectedDay] = useState(null);

    const firstDay = new Date(current.year, current.month, 1).getDay();
    const daysInMonth = new Date(current.year, current.month + 1, 0).getDate();

    // Map date -> meetings
    const meetingsByDate = {};
    meetings.forEach(m => {
        const d = new Date(m.date);
        if (d.getFullYear() === current.year && d.getMonth() === current.month) {
            const day = d.getDate();
            if (!meetingsByDate[day]) meetingsByDate[day] = [];
            meetingsByDate[day].push(m);
        }
    });

    const prev = () => setCurrent(c => {
        const d = new Date(c.year, c.month - 1);
        return { year: d.getFullYear(), month: d.getMonth() };
    });
    const next = () => setCurrent(c => {
        const d = new Date(c.year, c.month + 1);
        return { year: d.getFullYear(), month: d.getMonth() };
    });

    const cells = [];
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);

    const isToday = (day) =>
        day === today.getDate() && current.month === today.getMonth() && current.year === today.getFullYear();

    const selectedMeetings = selectedDay ? (meetingsByDate[selectedDay] || []) : [];

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center">
                            <MdCalendarMonth size={22} className="text-indigo-500" />
                        </div>
                        <p className="font-bold text-gray-900 dark:text-white text-sm">Calendar</p>
                    </div>
                    <div className="flex items-center gap-1">
                        <button onClick={prev} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors active:scale-95">
                            <MdChevronLeft size={18} className="text-gray-500" />
                        </button>
                        <span className="text-xs font-bold text-gray-700 dark:text-gray-300 w-28 text-center">
                            {MONTHS[current.month]} {current.year}
                        </span>
                        <button onClick={next} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors active:scale-95">
                            <MdChevronRight size={18} className="text-gray-500" />
                        </button>
                    </div>
                </div>
            </CardHeader>
            <CardBody>
                {/* Day headers */}
                <div className="grid grid-cols-7 mb-1">
                    {DAYS.map(d => (
                        <div key={d} className="text-center text-xs font-bold text-gray-400 py-1">{d}</div>
                    ))}
                </div>
                {/* Date cells */}
                <div className="grid grid-cols-7 gap-0.5">
                    {cells.map((day, i) => {
                        if (!day) return <div key={`e-${i}`} />;
                        const hasMeeting = !!meetingsByDate[day];
                        const count = meetingsByDate[day]?.length || 0;
                        const todayCell = isToday(day);
                        const selected = selectedDay === day;
                        return (
                            <button
                                key={day}
                                onClick={() => setSelectedDay(selected ? null : day)}
                                className={`
                                    relative flex flex-col items-center justify-center h-9 rounded-xl text-xs font-semibold
                                    transition-all duration-150 active:scale-95
                                    ${todayCell
                                        ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30'
                                        : selected
                                            ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 ring-2 ring-blue-400'
                                            : hasMeeting
                                                ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/30'
                                                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                                    }
                                `}
                            >
                                {day}
                                {hasMeeting && !todayCell && (
                                    <span className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5">
                                        {Array.from({ length: Math.min(count, 3) }).map((_, i) => (
                                            <span key={i} className="w-1 h-1 rounded-full bg-indigo-400 dark:bg-indigo-500" />
                                        ))}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* Selected day meetings */}
                {selectedDay && (
                    <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                        <p className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide">
                            {MONTHS[current.month]} {selectedDay}
                        </p>
                        {selectedMeetings.length === 0 ? (
                            <p className="text-xs text-gray-400">No meetings this day</p>
                        ) : (
                            <div className="space-y-1.5">
                                {selectedMeetings.map(m => (
                                    <button
                                        key={m.id}
                                        onClick={() => navigate(`/meetings/${m.id}`)}
                                        className="w-full flex items-center gap-2.5 p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left active:scale-[0.98]"
                                    >
                                        <MdVideoCall size={15} className="text-blue-500 flex-shrink-0" />
                                        <div className="min-w-0">
                                            <p className="text-xs font-semibold text-gray-900 dark:text-white truncate">{m.title}</p>
                                            <p className="text-xs text-gray-400">{m.time} · {m.duration}m</p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </CardBody>
        </Card>
    );
};

export default CalendarCard;
