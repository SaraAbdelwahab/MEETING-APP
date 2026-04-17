import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import meetingsAPI from '../../api/meetings';
import AppLayout from '../layout/AppLayout';
import { Calendar, Clock, Users, FileText, Plus, X, ArrowLeft } from 'lucide-react';
import './CreateMeeting.css';

const CreateMeeting = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    
    // Form state
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        date: '',
        time: '',
        duration: '60',
        invitees: [] // Array of email strings
    });

    // UI state
    const [inviteeInput, setInviteeInput] = useState('');
    const [inviteeError, setInviteeError] = useState('');
    const [errors, setErrors] = useState({});
    const [apiError, setApiError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // Get today's date in YYYY-MM-DD format for min date
    const today = new Date().toISOString().split('T')[0];

    // Handle input changes
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
        // Clear field error when user types
        if (errors[name]) {
            setErrors(prev => ({
                ...prev,
                [name]: ''
            }));
        }
    };

    // Handle invitee input
    const handleInviteeInputChange = (e) => {
        setInviteeInput(e.target.value);
        setInviteeError('');
    };

    // Add invitee to list
    const addInvitee = () => {
        const email = inviteeInput.trim();
        
        // Validate email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!email) {
            setInviteeError('Please enter an email address');
            return;
        }
        if (!emailRegex.test(email)) {
            setInviteeError('Please enter a valid email address');
            return;
        }
        if (formData.invitees.includes(email)) {
            setInviteeError('This email is already in the list');
            return;
        }
        if (email === user?.email) {
            setInviteeError('You cannot invite yourself (you are the creator)');
            return;
        }

        // Add to invitees list
        setFormData(prev => ({
            ...prev,
            invitees: [...prev.invitees, email]
        }));
        setInviteeInput('');
    };

    // Remove invitee from list
    const removeInvitee = (emailToRemove) => {
        setFormData(prev => ({
            ...prev,
            invitees: prev.invitees.filter(email => email !== emailToRemove)
        }));
    };

    // Handle Enter key in invitee input
    const handleInviteeKeyPress = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            addInvitee();
        }
    };

    // Validate form before submission
    const validateForm = () => {
        const newErrors = {};

        if (!formData.title.trim()) {
            newErrors.title = 'Title is required';
        }
        if (!formData.date) {
            newErrors.date = 'Date is required';
        }
        if (!formData.time) {
            newErrors.time = 'Time is required';
        }
        if (!formData.duration) {
            newErrors.duration = 'Duration is required';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // Handle form submission
    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        setIsLoading(true);
        setApiError('');

        try {
            const response = await meetingsAPI.createMeeting(formData);
            
            // Show success message and redirect to meeting details
            navigate(`/meetings/${response.meeting.id}`, {
                state: { message: 'Meeting created successfully!' }
            });
        } catch (error) {
            setApiError(error.message || 'Failed to create meeting');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <AppLayout>
            <div className="create-meeting-wrapper">
                {/* Back button */}
                <button
                    onClick={() => navigate('/dashboard')}
                    className="back-button"
                    disabled={isLoading}
                >
                    <ArrowLeft size={18} />
                    <span>Back to Dashboard</span>
                </button>

                <div className="create-meeting-card">
                    <div className="create-meeting-header">
                        <div className="header-icon">
                            <Calendar size={32} />
                        </div>
                        <h1>Schedule a New Meeting</h1>
                        <p>Fill in the details below to create your meeting</p>
                    </div>

                    {apiError && (
                        <div className="alert alert-error">
                            <span className="alert-icon">⚠️</span>
                            <span>{apiError}</span>
                            <button 
                                className="alert-close" 
                                onClick={() => setApiError('')}
                            >
                                <X size={16} />
                            </button>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="create-meeting-form">
                    {/* Title */}
                    <div className="form-group">
                        <label htmlFor="title">
                            <FileText size={16} />
                            <span>Meeting Title <span className="required">*</span></span>
                        </label>
                        <input
                            type="text"
                            id="title"
                            name="title"
                            value={formData.title}
                            onChange={handleChange}
                            placeholder="e.g., Project Kickoff, Team Sync, Client Meeting"
                            className={errors.title ? 'error' : ''}
                            disabled={isLoading}
                        />
                        {errors.title && (
                            <span className="error-message">{errors.title}</span>
                        )}
                    </div>

                    {/* Description */}
                    <div className="form-group">
                        <label htmlFor="description">
                            <FileText size={16} />
                            <span>Description <span className="optional">(optional)</span></span>
                        </label>
                        <textarea
                            id="description"
                            name="description"
                            value={formData.description}
                            onChange={handleChange}
                            placeholder="Add meeting agenda, goals, or notes..."
                            rows="4"
                            disabled={isLoading}
                        />
                    </div>

                    {/* Date and Time Row */}
                    <div className="form-row">
                        <div className="form-group">
                            <label htmlFor="date">
                                <Calendar size={16} />
                                <span>Date <span className="required">*</span></span>
                            </label>
                            <input
                                type="date"
                                id="date"
                                name="date"
                                value={formData.date}
                                onChange={handleChange}
                                min={today}
                                className={errors.date ? 'error' : ''}
                                disabled={isLoading}
                            />
                            {errors.date && (
                                <span className="error-message">{errors.date}</span>
                            )}
                        </div>

                        <div className="form-group">
                            <label htmlFor="time">
                                <Clock size={16} />
                                <span>Time <span className="required">*</span></span>
                            </label>
                            <input
                                type="time"
                                id="time"
                                name="time"
                                value={formData.time}
                                onChange={handleChange}
                                className={errors.time ? 'error' : ''}
                                disabled={isLoading}
                            />
                            {errors.time && (
                                <span className="error-message">{errors.time}</span>
                            )}
                        </div>

                        <div className="form-group">
                            <label htmlFor="duration">
                                <Clock size={16} />
                                <span>Duration <span className="required">*</span></span>
                            </label>
                            <select
                                id="duration"
                                name="duration"
                                value={formData.duration}
                                onChange={handleChange}
                                className={errors.duration ? 'error' : ''}
                                disabled={isLoading}
                            >
                                <option value="15">15 minutes</option>
                                <option value="30">30 minutes</option>
                                <option value="45">45 minutes</option>
                                <option value="60">1 hour</option>
                                <option value="90">1.5 hours</option>
                                <option value="120">2 hours</option>
                                <option value="180">3 hours</option>
                            </select>
                            {errors.duration && (
                                <span className="error-message">{errors.duration}</span>
                            )}
                        </div>
                    </div>

                    {/* Invite Participants */}
                    <div className="form-group">
                        <label htmlFor="invitees">
                            <Users size={16} />
                            <span>Invite Participants <span className="optional">(optional)</span></span>
                        </label>
                        <div className="invitee-input-group">
                            <input
                                type="email"
                                id="invitees"
                                value={inviteeInput}
                                onChange={handleInviteeInputChange}
                                onKeyPress={handleInviteeKeyPress}
                                placeholder="Enter email address and press Enter or click Add"
                                disabled={isLoading}
                                className={inviteeError ? 'error' : ''}
                            />
                            <button
                                type="button"
                                onClick={addInvitee}
                                className="btn-add-invitee"
                                disabled={isLoading}
                            >
                                <Plus size={16} />
                                <span>Add</span>
                            </button>
                        </div>
                        {inviteeError && (
                            <span className="error-message">{inviteeError}</span>
                        )}
                        <small className="hint">
                            Press Enter after typing each email
                        </small>
                    </div>

                    {/* Invitees List */}
                    {formData.invitees.length > 0 && (
                        <div className="invitees-list">
                            <label>Invited Participants ({formData.invitees.length}):</label>
                            <div className="invitee-tags">
                                {formData.invitees.map(email => (
                                    <div key={email} className="invitee-tag">
                                        <Users size={14} />
                                        <span>{email}</span>
                                        <button
                                            type="button"
                                            onClick={() => removeInvitee(email)}
                                            className="remove-invitee"
                                            disabled={isLoading}
                                        >
                                            <X size={14} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Form Actions */}
                    <div className="form-actions">
                        <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={() => navigate('/dashboard')}
                            disabled={isLoading}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <>
                                    <span className="spinner-small"></span>
                                    Creating...
                                </>
                            ) : (
                                <>
                                    <Calendar size={16} />
                                    Create Meeting
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
        </AppLayout>
    );
};

export default CreateMeeting;