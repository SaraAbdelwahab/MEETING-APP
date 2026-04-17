import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MdAccessTime, MdGroup, MdArrowForward, MdDelete, MdCheckCircle, MdCancel, MdVideoCall, MdFiberManualRecord, MdMoreVert, MdEdit } from 'react-icons/md';
import Badge from '../ui/Badge';
import toast from 'react-hot-toast';

const MeetingRow = ({ meeting, onStatusUpdate, onDelete, isCreator }) => {
    const navigate = useNavigate();
    const [updating, setUpdating] = useState(false);
    const [showMenu, setShowMenu] = useState(false);
    const [deleted, setDeleted] = useState(false);

    if (deleted) return null;

    const start = new Date(`${meeting.date}T${meeting.time}`);
    const now = new Date();
    const isPast = start < now;
    const isLive = !isPast && now >= start && now <= new Date(start.getTime() + (meeting.duration || 60) * 60000);
    const isToday = meeting.date === now.toISOString().split('T')[0];

    const statusBadge = () => {
        if (meeting.user_role === 'creator') return <Badge variant="info">Creator</Badge>;
        const map = { accepted: 'success', declined: 'error', pending: 'warning' };
        const labels = { accepted: 'Accepted', declined: 'Declined', pending: 'Pending' };
        const v = meeting.participant_status || 'pending';
        return <Badge variant={map[v]}>{labels[v]}</Badge>;
    };

    const handleStatus = async (status) => {
        setUpdating(true);
        const ok = await onStatusUpdate(meeting.id, status);
        setUpdating(false);
        if (ok !== false) {
            toast.success(`Meeting ${status}`);
        }
    };

    const handleDelete = async () => {
        if (!window.confirm(`Delete "${meeting.title}"?`)) return;
        setUpdating(true);
        const ok = await onDelete(meeting.id);
        if (ok !== false) {
            setDeleted(true);
            toast.success('Meeting deleted');
        }
        setUpdating(false);
        setShowMenu(false);
    };

    const handleJoin = (e) => {
        e.stopPropagation();
        navigate(`/meeting/${meeting.id}`);
    };

    return (
        <div
            className={`
                flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl border
                transition-all duration-150 group relative
                ${isPast
                    ? 'bg-gray-50 dark:bg-gray-900/50 border-gray-100 dark:border-gray-800/50 opacity-60'
                    : isLive
                        ? 'bg-blue-50/50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800 shadow-sm'
                        : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 hover:border-blue-200 dark:hover:border-blue-800 hover:shadow-sm'
                }
            `}
        >
            {/* Date block */}
            <div className="flex-shrink-0 w-11 text-center">
                <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wide">
                    {start.toLocaleString('default', { month: 'short' })}
                </p>
                <p className={`text-xl font-extrabold leading-tight ${isLive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-900 dark:text-white'}`}>
                    {start.getDate()}
                </p>
            </div>

            {/* Color bar */}
            <div className={`w-0.5 h-10 rounded-full flex-shrink-0 ${
                isLive ? 'bg-blue-500' :
                isPast ? 'bg-gray-200 dark:bg-gray-700' :
                isToday ? 'bg-orange-400' : 'bg-gray-300 dark:bg-gray-600'
            }`} />

            {/* Content */}
            <div
                className="flex-1 min-w-0 cursor-pointer"
                onClick={() => navigate(`/meeting/${meeting.id}`)}
            >
                <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                    <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{meeting.title}</p>
                    {isLive && (
                        <span className="flex items-center gap-1 text-xs font-bold text-blue-600 dark:text-blue-400">
                            <MdFiberManualRecord size={10} className="animate-pulse" />
                            Live
                        </span>
                    )}
                    {isToday && !isLive && !isPast && (
                        <Badge variant="warning">Today</Badge>
                    )}
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 flex-wrap">
                    <span className="flex items-center gap-1">
                        <MdAccessTime size={12} />
                        {start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {meeting.duration}m
                    </span>
                    <span className="flex items-center gap-1">
                        <MdGroup size={12} />
                        {meeting.participants?.length || 0}
                    </span>
                    {meeting.creator_name && (
                        <span className="hidden sm:inline truncate max-w-[120px]">by {meeting.creator_name}</span>
                    )}
                </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1.5 flex-shrink-0">
                {statusBadge()}

                {/* Accept/Decline for pending invitations */}
                {!isPast && meeting.user_role === 'participant' && meeting.participant_status === 'pending' && (
                    <>
                        <button
                            onClick={() => handleStatus('accepted')}
                            disabled={updating}
                            title="Accept"
                            className="w-8 h-8 flex items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-all active:scale-90 disabled:opacity-50"
                        >
                            <MdCheckCircle size={17} />
                        </button>
                        <button
                            onClick={() => handleStatus('declined')}
                            disabled={updating}
                            title="Decline"
                            className="w-8 h-8 flex items-center justify-center rounded-xl bg-red-50 dark:bg-red-900/20 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/40 transition-all active:scale-90 disabled:opacity-50"
                        >
                            <MdCancel size={17} />
                        </button>
                    </>
                )}

                {/* Join button for live meetings */}
                {isLive && (
                    <button
                        onClick={handleJoin}
                        className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-bold rounded-xl transition-all active:scale-95 shadow-sm shadow-blue-500/30"
                    >
                        <MdVideoCall size={14} />
                        Join
                    </button>
                )}

                {/* More menu */}
                <div className="relative">
                    <button
                        onClick={(e) => { e.stopPropagation(); setShowMenu(v => !v); }}
                        className="w-8 h-8 flex items-center justify-center rounded-xl text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-600 dark:hover:text-gray-300 transition-all active:scale-90 opacity-0 group-hover:opacity-100"
                    >
                        <MdMoreVert size={17} />
                    </button>

                    {showMenu && (
                        <div
                            className="absolute right-0 top-9 w-40 bg-white dark:bg-gray-900 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 z-20 overflow-hidden"
                            onMouseLeave={() => setShowMenu(false)}
                        >
                            <button
                                onClick={() => { navigate(`/meeting/${meeting.id}`); setShowMenu(false); }}
                                className="flex items-center gap-2.5 w-full px-3 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                            >
                                <MdArrowForward size={15} className="text-gray-400" />
                                Join Meeting
                            </button>
                            {!isPast && isCreator && (
                                <button
                                    onClick={() => { navigate(`/meeting/${meeting.id}`); setShowMenu(false); }}
                                    className="flex items-center gap-2.5 w-full px-3 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                                >
                                    <MdEdit size={15} className="text-gray-400" />
                                    Edit
                                </button>
                            )}
                            {isCreator && (
                                <button
                                    onClick={handleDelete}
                                    disabled={updating}
                                    className="flex items-center gap-2.5 w-full px-3 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
                                >
                                    <MdDelete size={15} />
                                    Delete
                                </button>
                            )}
                        </div>
                    )}
                </div>

                <button
                    onClick={() => navigate(`/meeting/${meeting.id}`)}
                    className="w-8 h-8 flex items-center justify-center rounded-xl text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-600 dark:hover:text-gray-300 transition-all active:scale-90"
                >
                    <MdArrowForward size={17} />
                </button>
            </div>
        </div>
    );
};

export default MeetingRow;
