import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useMeetings } from '../../hooks/useMeetings';
import { MdAdd, MdRefresh, MdVideoCall, MdAccessTime, MdGroup, MdArrowForward, MdDelete, MdCheckCircle, MdCancel, MdFiberManualRecord, MdMoreVert } from 'react-icons/md';
import { FiLoader } from 'react-icons/fi';
import './Pages.css';

// Safe date parsing with fallback
const parseDate = (meeting) => {
    try {
        // Try scheduledTime first
        if (meeting.scheduledTime) {
            const date = new Date(meeting.scheduledTime);
            if (!isNaN(date.getTime())) return date;
        }
        // Try date + time combination
        if (meeting.date && meeting.time) {
            const date = new Date(`${meeting.date}T${meeting.time}`);
            if (!isNaN(date.getTime())) return date;
        }
        // Fallback to current date
        return new Date();
    } catch {
        return new Date();
    }
};

const formatDate = (date) => {
    try {
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
        return 'Invalid Date';
    }
};

const formatTime = (date) => {
    try {
        return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    } catch {
        return '--:--';
    }
};

const MeetingCard = ({ meeting, onStatusUpdate, onDelete, onNavigate }) => {
    const [updating, setUpdating] = React.useState(false);
    const [showMenu, setShowMenu] = React.useState(false);
    const [deleted, setDeleted] = React.useState(false);

    if (deleted) return null;

    const startDate = parseDate(meeting);
    const now = new Date();
    const duration = meeting.duration || 60;
    const endDate = new Date(startDate.getTime() + duration * 60000);
    const isPast = endDate < now; // Meeting has completely ended
    const isLive = now >= startDate && now <= endDate; // Meeting is currently happening
    const isUpcoming = startDate > now; // Meeting hasn't started yet
    const isToday = startDate.toDateString() === now.toDateString();
    const isCreator = meeting.user_role === 'creator';

    const handleStatus = async (status) => {
        setUpdating(true);
        await onStatusUpdate(meeting.id, status);
        setUpdating(false);
    };

    const handleDelete = async () => {
        if (!window.confirm(`Delete "${meeting.title}"?`)) return;
        setUpdating(true);
        const ok = await onDelete(meeting.id);
        if (ok !== false) setDeleted(true);
        setUpdating(false);
        setShowMenu(false);
    };

    const statusBadge = () => {
        if (isCreator) {
            return (
                <span className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-800">
                    Creator
                </span>
            );
        }
        const status = meeting.participant_status || 'pending';
        const variants = {
            accepted: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800',
            declined: 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-100 dark:border-red-800',
            pending: 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-800'
        };
        const labels = { accepted: 'Accepted', declined: 'Declined', pending: 'Pending' };
        return (
            <span className={`px-2.5 py-1 text-xs font-semibold rounded-lg border ${variants[status]}`}>
                {labels[status]}
            </span>
        );
    };

    return (
        <div
            className={`
                group relative rounded-2xl border transition-all duration-200
                ${isPast
                    ? 'bg-gray-50/50 dark:bg-gray-900/30 border-gray-200 dark:border-gray-800 opacity-70'
                    : isLive
                        ? 'bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border-blue-200 dark:border-blue-800 shadow-lg shadow-blue-100 dark:shadow-blue-900/20'
                        : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 hover:border-blue-200 dark:hover:border-blue-700 hover:shadow-xl dark:hover:shadow-2xl hover:shadow-gray-100 dark:hover:shadow-black/40'
                }
            `}
        >
            <div className="p-6">
                {/* Header */}
                <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                            <h3 
                                className="text-lg font-bold text-gray-900 dark:text-white truncate cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                                onClick={() => onNavigate(meeting.id)}
                            >
                                {meeting.title}
                            </h3>
                            {isToday && !isLive && !isPast && (
                                <span className="px-2 py-0.5 text-xs font-bold rounded-md bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">
                                    Today
                                </span>
                            )}
                        </div>
                        {meeting.description && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-3">
                                {meeting.description}
                            </p>
                        )}
                    </div>

                    {/* More menu */}
                    <div className="relative flex-shrink-0">
                        <button
                            onClick={(e) => { e.stopPropagation(); setShowMenu(v => !v); }}
                            className="w-9 h-9 flex items-center justify-center rounded-xl text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-600 dark:hover:text-gray-300 transition-all"
                        >
                            <MdMoreVert size={20} />
                        </button>

                        {showMenu && (
                            <>
                                <div 
                                    className="fixed inset-0 z-10" 
                                    onClick={() => setShowMenu(false)}
                                />
                                <div className="absolute right-0 top-10 w-48 bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 z-20 overflow-hidden">
                                    <button
                                        onClick={() => { onNavigate(meeting.id); setShowMenu(false); }}
                                        className="flex items-center gap-3 w-full px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                                    >
                                        <MdArrowForward size={16} className="text-gray-400" />
                                        View Details
                                    </button>
                                    {isCreator && (
                                        <button
                                            onClick={handleDelete}
                                            disabled={updating}
                                            className="flex items-center gap-3 w-full px-4 py-3 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
                                        >
                                            <MdDelete size={16} />
                                            Delete Meeting
                                        </button>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* Meta info */}
                <div className="flex flex-wrap items-center gap-4 mb-4 text-sm text-gray-600 dark:text-gray-400">
                    <div className="flex items-center gap-2">
                        <MdAccessTime size={16} className="text-gray-400" />
                        <span className="font-medium">{formatDate(startDate)}</span>
                        <span className="text-gray-400">•</span>
                        <span>{formatTime(startDate)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <MdGroup size={16} className="text-gray-400" />
                        <span>{meeting.participants?.length || 0} participants</span>
                    </div>
                    {meeting.creator_name && (
                        <div className="text-xs text-gray-500 dark:text-gray-500">
                            by {meeting.creator_name}
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-4 border-t border-gray-100 dark:border-gray-800">
                    {statusBadge()}

                    <div className="flex-1" />

                    {/* Accept/Decline for pending invitations (only for upcoming meetings) */}
                    {isUpcoming && !isCreator && meeting.participant_status === 'pending' && (
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => handleStatus('accepted')}
                                disabled={updating}
                                className="flex items-center gap-1.5 px-4 py-2 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 rounded-xl text-sm font-semibold transition-all active:scale-95 disabled:opacity-50"
                            >
                                <MdCheckCircle size={16} />
                                Accept
                            </button>
                            <button
                                onClick={() => handleStatus('declined')}
                                disabled={updating}
                                className="flex items-center gap-1.5 px-4 py-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-xl text-sm font-semibold transition-all active:scale-95 disabled:opacity-50"
                            >
                                <MdCancel size={16} />
                                Decline
                            </button>
                        </div>
                    )}

                    {/* Join/View button */}
                    {isPast ? (
                        <button
                            disabled
                            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600 cursor-not-allowed"
                        >
                            <MdCancel size={16} />
                            Ended
                        </button>
                    ) : (
                        <button
                            onClick={() => onNavigate(meeting.id)}
                            className={`
                                flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-95
                                ${isLive
                                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg shadow-blue-500/30'
                                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                                }
                            `}
                        >
                            {isLive ? (
                                <>
                                    <MdVideoCall size={18} />
                                    Join Now
                                </>
                            ) : (
                                <>
                                    <MdArrowForward size={16} />
                                    View
                                </>
                            )}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

const MeetingsPage = () => {
    const navigate = useNavigate();
    const { meetings, loading, error, fetchMeetings, updateStatus, deleteMeeting } = useMeetings();

    if (loading) {
        return (
            <div className="loading-container">
                <FiLoader size={32} className="loading-spinner" />
                <p className="loading-text">Loading meetings…</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="error-container">
                <div className="error-icon-wrapper">
                    <MdRefresh size={28} className="error-icon" />
                </div>
                <p className="error-text">{error}</p>
                <button onClick={fetchMeetings} className="btn-primary">
                    <MdRefresh size={16} />
                    Try Again
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="page-header-section">
                <div className="page-header-left">
                    <div className="page-icon-wrapper page-icon-blue">
                        <MdVideoCall size={24} />
                    </div>
                    <div className="page-header-info">
                        <h1 className="page-title-main">All Meetings</h1>
                        <p className="page-subtitle-main">
                            {meetings.length} {meetings.length === 1 ? 'meeting' : 'meetings'} total
                        </p>
                    </div>
                </div>
                <div className="page-header-actions">
                    <button onClick={fetchMeetings} className="btn-icon" title="Refresh">
                        <MdRefresh size={20} />
                    </button>
                    <button onClick={() => navigate('/create-meeting')} className="btn-primary">
                        <MdAdd size={20} />
                        New Meeting
                    </button>
                </div>
            </div>

            {/* Meetings Grid */}
            {meetings.length === 0 ? (
                <div className="content-card">
                    <div className="content-card-body">
                        <div className="empty-state-container">
                            <div className="empty-icon-wrapper">
                                <MdVideoCall size={32} className="empty-icon" />
                            </div>
                            <p className="empty-title">No meetings yet</p>
                            <p className="empty-description">Create your first meeting to get started</p>
                            <button onClick={() => navigate('/create-meeting')} className="btn-primary">
                                <MdAdd size={18} />
                                Create Meeting
                            </button>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {meetings.map(meeting => (
                        <MeetingCard
                            key={meeting.id}
                            meeting={meeting}
                            onStatusUpdate={updateStatus}
                            onDelete={deleteMeeting}
                            onNavigate={(id) => navigate(`/meeting/${id}`)}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export default MeetingsPage;
