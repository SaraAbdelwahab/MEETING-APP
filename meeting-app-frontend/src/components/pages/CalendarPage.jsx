import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MdCalendarMonth, MdChevronLeft, MdChevronRight, MdVideoCall, MdAccessTime } from 'react-icons/md';
import { FiLoader } from 'react-icons/fi';
import meetingsAPI from '../../api/meetings';
import './Pages.css';

const CalendarPage = () => {
    const navigate = useNavigate();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [meetings, setMeetings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState(null);

    useEffect(() => {
        fetchMeetings();
    }, []);

    const fetchMeetings = async () => {
        try {
            setLoading(true);
            const response = await meetingsAPI.getUserMeetings();
            setMeetings(response.meetings || []);
        } catch (error) {
            console.error('Failed to fetch meetings:', error);
        } finally {
            setLoading(false);
        }
    };

    const getDaysInMonth = (date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDayOfWeek = firstDay.getDay();
        
        return { daysInMonth, startingDayOfWeek, year, month };
    };

    const getMeetingsForDate = (date) => {
        const dateStr = date.toISOString().split('T')[0];
        return meetings.filter(m => m.date === dateStr);
    };

    const { daysInMonth, startingDayOfWeek, year, month } = getDaysInMonth(currentDate);
    const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });

    const previousMonth = () => {
        setCurrentDate(new Date(year, month - 1, 1));
    };

    const nextMonth = () => {
        setCurrentDate(new Date(year, month + 1, 1));
    };

    const dayMeetings = selectedDate ? getMeetingsForDate(selectedDate) : [];

    return (
        <>
            <div className="page-header-section">
                <div className="page-header-left">
                    <div className="page-icon-wrapper page-icon-purple">
                        <MdCalendarMonth size={24} />
                    </div>
                    <div className="page-header-info">
                        <h1 className="page-title-main">Calendar</h1>
                        <p className="page-subtitle-main">View your meeting schedule</p>
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="loading-container">
                    <FiLoader size={32} className="loading-spinner" />
                    <p className="loading-text">Loading calendar…</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        {/* Calendar */}
                        <div className="content-card lg:col-span-2">
                            <div className="content-card-body">
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                                    <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">{monthName}</h2>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <button onClick={previousMonth} className="btn-icon">
                                            <MdChevronLeft size={20} />
                                        </button>
                                        <button onClick={nextMonth} className="btn-icon">
                                            <MdChevronRight size={20} />
                                        </button>
                                    </div>
                                </div>

                                {/* Calendar Grid */}
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
                                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                                        <div key={day} style={{ textAlign: 'center', fontSize: '11px', fontWeight: '600', color: '#64748b', padding: '4px 0' }}>
                                            {day}
                                        </div>
                                    ))}
                                    {Array.from({ length: startingDayOfWeek }).map((_, i) => (
                                        <div key={`empty-${i}`} />
                                    ))}
                                    {Array.from({ length: daysInMonth }).map((_, i) => {
                                        const day = i + 1;
                                        const date = new Date(year, month, day);
                                        const dayMeetings = getMeetingsForDate(date);
                                        const isToday = date.toDateString() === new Date().toDateString();
                                        const isSelected = selectedDate?.toDateString() === date.toDateString();

                                        return (
                                            <button
                                                key={day}
                                                onClick={() => setSelectedDate(date)}
                                                style={{
                                                    aspectRatio: '1',
                                                    borderRadius: '8px',
                                                    padding: '6px',
                                                    fontSize: '13px',
                                                    fontWeight: '500',
                                                    border: isSelected ? '2px solid #8b5cf6' : '1px solid #e2e8f0',
                                                    background: isToday ? 'rgba(139, 92, 246, 0.1)' : '#ffffff',
                                                    color: isToday ? '#8b5cf6' : '#0f172a',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s ease',
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    gap: '2px',
                                                    minHeight: '40px'
                                                }}
                                                onMouseEnter={(e) => {
                                                    if (!isSelected) e.currentTarget.style.background = '#f8fafc';
                                                }}
                                                onMouseLeave={(e) => {
                                                    if (!isSelected) e.currentTarget.style.background = isToday ? 'rgba(139, 92, 246, 0.1)' : '#ffffff';
                                                }}
                                            >
                                                <div>{day}</div>
                                                {dayMeetings.length > 0 && (
                                                    <div style={{ display: 'flex', justifyContent: 'center', gap: '2px' }}>
                                                        {dayMeetings.slice(0, 3).map((_, i) => (
                                                            <div key={i} style={{ width: '3px', height: '3px', borderRadius: '50%', background: '#8b5cf6' }} />
                                                        ))}
                                                    </div>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        {/* Selected Day Meetings */}
                        <div className="content-card lg:col-span-1">
                            <div className="content-card-body">
                                <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white mb-4">
                                    {selectedDate ? selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Select a date'}
                                </h3>
                                {selectedDate && dayMeetings.length > 0 ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                        {dayMeetings.map(meeting => (
                                            <div
                                                key={meeting.id}
                                                onClick={() => navigate(`/meeting/${meeting.id}`)}
                                                className="p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 cursor-pointer transition-all hover:border-purple-300 dark:hover:border-purple-600 hover:shadow-md"
                                            >
                                                <div style={{ display: 'flex', alignItems: 'start', gap: '8px' }}>
                                                    <MdVideoCall size={18} className="text-purple-600 dark:text-purple-400 mt-0.5 flex-shrink-0" />
                                                    <div style={{ flex: 1, minWidth: 0 }}>
                                                        <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                                                            {meeting.title}
                                                        </p>
                                                        <div className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400 mt-1">
                                                            <MdAccessTime size={12} />
                                                            {meeting.time}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : selectedDate ? (
                                    <p className="text-sm text-gray-600 dark:text-gray-400">No meetings scheduled</p>
                                ) : (
                                    <p className="text-sm text-gray-600 dark:text-gray-400">Select a date to view meetings</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default CalendarPage;
