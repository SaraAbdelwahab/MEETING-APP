import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  MdCalendarToday, MdAccessTime, MdAdd, MdSearch, MdFilterList,
  MdShowChart, MdPlayArrow, MdMoreVert
} from 'react-icons/md';
import { Video, Clock, Users, CheckCircle, TrendingUp, ChevronRight } from 'lucide-react';
import './PremiumDashboard.css';

const PremiumDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [meetings, setMeetings] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('upcoming');
  const [stats, setStats] = useState({
    totalMeetings: 0,
    upcomingMeetings: 0,
    completedMeetings: 0,
    totalParticipants: 0
  });

  useEffect(() => {
    fetchMeetings();
    fetchStats();
  }, []);

  const fetchMeetings = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/meetings', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        console.log('Meetings data:', data);
        setMeetings(Array.isArray(data.meetings) ? data.meetings : []);
      } else {
        console.error('Meetings fetch failed:', response.status);
        setMeetings([]);
      }
    } catch (error) {
      console.error('Failed to fetch meetings:', error);
      setMeetings([]);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/meetings/stats', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        console.log('Stats data:', data);
        setStats({
          totalMeetings: data.stats?.totalMeetings || 0,
          upcomingMeetings: data.stats?.upcomingMeetings || 0,
          completedMeetings: data.stats?.pastMeetings || 0,
          totalParticipants: data.stats?.totalMeetings || 0
        });
      } else {
        console.error('Stats fetch failed:', response.status);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
      setStats({
        totalMeetings: 0,
        upcomingMeetings: 0,
        completedMeetings: 0,
        totalParticipants: 0
      });
    }
  };

  const handleCreateMeeting = () => {
    navigate('/create-meeting');
  };

  const handleJoinMeeting = (meetingId) => {
    navigate(`/meeting/${meetingId}`);
  };

  const filteredMeetings = Array.isArray(meetings) 
    ? meetings.filter(meeting =>
        meeting.title?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];

  const upcomingMeetings = filteredMeetings.filter(m => {
    try {
      const meetingDate = m.scheduledTime 
        ? new Date(m.scheduledTime) 
        : new Date(`${m.date}T${m.time}`);
      return meetingDate > new Date();
    } catch {
      return false;
    }
  });
  
  const pastMeetings = filteredMeetings.filter(m => {
    try {
      const meetingDate = m.scheduledTime 
        ? new Date(m.scheduledTime) 
        : new Date(`${m.date}T${m.time}`);
      return meetingDate <= new Date();
    } catch {
      return false;
    }
  });

  const displayMeetings = activeTab === 'upcoming' ? upcomingMeetings : pastMeetings;

  const statCards = [
    {
      id: 'total',
      icon: Video,
      label: 'Total Meetings',
      value: stats.totalMeetings,
      trend: '+12%',
      trendLabel: 'from last month',
      color: 'blue',
      bgClass: 'bg-blue-50 dark:bg-blue-950/30',
      iconClass: 'text-blue-600 dark:text-blue-400',
      route: '/meetings'
    },
    {
      id: 'upcoming',
      icon: Clock,
      label: 'Upcoming',
      value: stats.upcomingMeetings,
      trend: '+8%',
      trendLabel: 'this week',
      color: 'emerald',
      bgClass: 'bg-emerald-50 dark:bg-emerald-950/30',
      iconClass: 'text-emerald-600 dark:text-emerald-400',
      route: '/calendar'
    },
    {
      id: 'participants',
      icon: Users,
      label: 'Participants',
      value: stats.totalParticipants,
      trend: '+15%',
      trendLabel: 'growth',
      color: 'purple',
      bgClass: 'bg-purple-50 dark:bg-purple-950/30',
      iconClass: 'text-purple-600 dark:text-purple-400',
      route: '/meetings'
    },
    {
      id: 'completed',
      icon: CheckCircle,
      label: 'Completed',
      value: stats.completedMeetings,
      trend: '+20%',
      trendLabel: 'success rate',
      color: 'amber',
      bgClass: 'bg-amber-50 dark:bg-amber-950/30',
      iconClass: 'text-amber-600 dark:text-amber-400',
      route: '/recordings'
    }
  ];

  return (
    <>
      {/* Page Title Section */}
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2">Dashboard</h1>
        <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">Welcome back, {user?.username} 👋</p>
      </div>

      {/* Premium Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.id}
              onClick={() => navigate(stat.route)}
              className="group relative bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-3 cursor-pointer transition-all duration-300 hover:shadow-xl dark:hover:shadow-2xl hover:shadow-gray-100 dark:hover:shadow-black/40 hover:-translate-y-1 hover:border-gray-300 dark:hover:border-gray-700"
            >
              {/* Icon Circle */}
              <div className={`w-9 h-9 rounded-lg ${stat.bgClass} flex items-center justify-center mb-2 transition-transform duration-300 group-hover:scale-110`}>
                <Icon className={`w-4 h-4 ${stat.iconClass}`} />
              </div>

              {/* Stats Content */}
              <div className="mb-2">
                <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-0.5">
                  {stat.label}
                </p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">
                  {stat.value}
                </p>
              </div>

              {/* Trend */}
              <div className="flex items-center gap-1 text-xs">
                <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 font-semibold">
                  <TrendingUp className="w-2.5 h-2.5" />
                  <span className="text-[10px]">{stat.trend}</span>
                </div>
                <span className="text-gray-500 dark:text-gray-500 text-[10px]">
                  {stat.trendLabel}
                </span>
              </div>

              {/* Arrow Icon */}
              <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <ChevronRight className={`w-4 h-4 ${stat.iconClass}`} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Search and Filters */}
      <div className="content-controls">
        <div className="search-container">
          <MdSearch size={20} className="search-icon" />
          <input
            type="text"
            placeholder="Search meetings by title..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
        </div>
        <div className="tabs-container">
          <button
            className={`tab-btn ${activeTab === 'upcoming' ? 'active' : ''}`}
            onClick={() => setActiveTab('upcoming')}
          >
            <MdAccessTime size={16} />
            <span>Upcoming</span>
            <span className="tab-count">{upcomingMeetings.length}</span>
          </button>
          <button
            className={`tab-btn ${activeTab === 'past' ? 'active' : ''}`}
            onClick={() => setActiveTab('past')}
          >
            <MdShowChart size={16} />
            <span>Past</span>
            <span className="tab-count">{pastMeetings.length}</span>
          </button>
        </div>
        <button className="filter-btn">
          <MdFilterList size={18} />
          <span>Filter</span>
        </button>
      </div>

      {/* Meetings Grid */}
      <div className="meetings-section">
        {displayMeetings.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">
              <MdCalendarToday size={56} />
            </div>
            <h3>No {activeTab} meetings</h3>
            <p>
              {activeTab === 'upcoming' 
                ? 'Create your first meeting to get started' 
                : 'No past meetings to display'}
            </p>
            {activeTab === 'upcoming' && (
              <button className="primary-btn" onClick={handleCreateMeeting}>
                <MdAdd size={20} />
                <span>Create Meeting</span>
              </button>
            )}
          </div>
        ) : (
          <div className="meetings-grid">
            {displayMeetings.map((meeting) => {
              const meetingDateTime = meeting.scheduledTime 
                ? new Date(meeting.scheduledTime)
                : new Date(`${meeting.date}T${meeting.time}`);
              
              return (
                <div key={meeting.id} className="meeting-card">
                  <div className="meeting-card-header">
                    <div className="meeting-time">
                      <MdAccessTime size={14} />
                      <span>{meetingDateTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <button className="card-menu-btn" title="More options">
                      <MdMoreVert size={18} />
                    </button>
                  </div>
                  <h3 className="meeting-title">{meeting.title}</h3>
                  <p className="meeting-description">{meeting.description || 'No description provided'}</p>
                  <div className="meeting-meta">
                    <div className="meeting-date">
                      <MdCalendarToday size={14} />
                      <span>{meetingDateTime.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    </div>
                    <div className="meeting-participants">
                      <Users className="w-3.5 h-3.5" />
                      <span>{meeting.participants?.length || 0} people</span>
                    </div>
                  </div>
                  <button
                    className="join-meeting-btn"
                    onClick={() => handleJoinMeeting(meeting.id)}
                  >
                    <MdPlayArrow size={18} />
                    <span>Join Meeting</span>
                    <ChevronRight size={18} className="btn-arrow" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
};

export default PremiumDashboard;
