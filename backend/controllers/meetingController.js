const Meeting = require('../models/Meeting');
const Participant = require('../models/Participant');
const User = require('../models/User');

const meetingController = {
    // Create a new meeting
    async createMeeting(req, res) {
        try {
            const { title, description, date, time, duration, invitees } = req.body;
            const creatorId = req.user.userId;

            // Validation
            if (!title || !date || !time || !duration) {
                return res.status(400).json({ 
                    message: 'Please provide title, date, time, and duration' 
                });
            }

            // Create the meeting
            const meetingId = await Meeting.create({
                title,
                description,
                date,
                time,
                duration
            }, creatorId);

            // Add participants if any were invited
            if (invitees && invitees.length > 0) {
                const validInvitees = [];
                for (const email of invitees) {
                    const user = await User.findByEmail(email);
                    if (user && user.id !== creatorId) {
                        validInvitees.push(user.id);
                    }
                }
                
                if (validInvitees.length > 0) {
                    await Participant.addParticipants(meetingId, validInvitees);
                }
            }

            // Get the complete meeting details
            const meeting = await Meeting.findById(meetingId);
            const participants = await Participant.getMeetingParticipants(meetingId);

            res.status(201).json({
                message: 'Meeting created successfully',
                meeting: {
                    ...meeting,
                    participants
                }
            });

        } catch (error) {
            console.error('Create meeting error:', error);
            res.status(500).json({ 
                message: 'Error creating meeting' 
            });
        }
    },

    // Get all meetings for the logged-in user
    async getUserMeetings(req, res) {
        try {
            const userId = req.user.userId;
            
            const meetings = await Meeting.getUserMeetings(userId);
            
            const meetingsWithParticipants = await Promise.all(
                meetings.map(async (meeting) => {
                    const participants = await Participant.getMeetingParticipants(meeting.id);
                    return {
                        ...meeting,
                        participants
                    };
                })
            );

            res.status(200).json({
                message: 'Meetings retrieved successfully',
                meetings: meetingsWithParticipants
            });

        } catch (error) {
            console.error('Get meetings error:', error);
            res.status(500).json({ 
                message: 'Error retrieving meetings' 
            });
        }
    },

    // Get single meeting details
    async getMeeting(req, res) {
        try {
            const meetingId = req.params.id;
            const userId = req.user.userId;

            const meeting = await Meeting.findById(meetingId);
            
            if (!meeting) {
                return res.status(404).json({ 
                    message: 'Meeting not found' 
                });
            }

            // Check if user has access
            const isParticipant = await Participant.isParticipant(meetingId, userId);
            
            if (meeting.created_by !== userId && !isParticipant) {
                return res.status(403).json({ 
                    message: 'You do not have access to this meeting' 
                });
            }

            const participants = await Participant.getMeetingParticipants(meetingId);

            res.status(200).json({
                message: 'Meeting retrieved successfully',
                meeting: {
                    ...meeting,
                    participants
                }
            });

        } catch (error) {
            console.error('Get meeting error:', error);
            res.status(500).json({ 
                message: 'Error retrieving meeting' 
            });
        }
    },

    // Update meeting
    async updateMeeting(req, res) {
        try {
            const meetingId = req.params.id;
            const userId = req.user.userId;
            const { title, description, date, time, duration, invitees } = req.body;

            // Check if meeting exists
            const meeting = await Meeting.findById(meetingId);
            if (!meeting) {
                return res.status(404).json({ 
                    message: 'Meeting not found' 
                });
            }

            // Check if user is the creator
            const isCreator = await Meeting.isCreator(meetingId, userId);
            if (!isCreator) {
                return res.status(403).json({ 
                    message: 'Only the meeting creator can update this meeting' 
                });
            }

            // Update meeting details
            const updated = await Meeting.update(meetingId, {
                title,
                description,
                date,
                time,
                duration
            });

            if (!updated) {
                return res.status(400).json({ 
                    message: 'No changes made to meeting' 
                });
            }

            // Handle invitees if provided
            if (invitees && invitees.length > 0) {
                // Get current participants
                const currentParticipants = await Participant.getMeetingParticipants(meetingId);
                const currentEmails = currentParticipants.map(p => p.email);

                // Find new invitees (not already participants)
                const newInvitees = [];
                for (const email of invitees) {
                    if (!currentEmails.includes(email)) {
                        const user = await User.findByEmail(email);
                        if (user && user.id !== userId) {
                            newInvitees.push(user.id);
                        }
                    }
                }

                // Add new invitees
                if (newInvitees.length > 0) {
                    await Participant.addParticipants(meetingId, newInvitees);
                }
            }

            // Get updated meeting details
            const updatedMeeting = await Meeting.findById(meetingId);
            const participants = await Participant.getMeetingParticipants(meetingId);

            res.status(200).json({
                message: 'Meeting updated successfully',
                meeting: {
                    ...updatedMeeting,
                    participants
                }
            });

        } catch (error) {
            console.error('Update meeting error:', error);
            res.status(500).json({ 
                message: 'Error updating meeting' 
            });
        }
    },

    // Delete meeting
    async deleteMeeting(req, res) {
        try {
            const meetingId = req.params.id;
            const userId = req.user.userId;

            // Check if meeting exists
            const meeting = await Meeting.findById(meetingId);
            if (!meeting) {
                return res.status(404).json({ 
                    message: 'Meeting not found' 
                });
            }

            // Check if user is the creator
            const isCreator = await Meeting.isCreator(meetingId, userId);
            if (!isCreator) {
                return res.status(403).json({ 
                    message: 'Only the meeting creator can delete this meeting' 
                });
            }

            // Delete the meeting (participants will be deleted automatically due to CASCADE)
            await Meeting.delete(meetingId);

            res.status(200).json({
                message: 'Meeting deleted successfully'
            });

        } catch (error) {
            console.error('Delete meeting error:', error);
            res.status(500).json({ 
                message: 'Error deleting meeting' 
            });
        }
    },

    // Update participant status (accept/decline)
    async updateParticipantStatus(req, res) {
        try {
            const meetingId = req.params.id;
            const userId = req.user.userId;
            const { status } = req.body;

            if (!status || !['accepted', 'declined'].includes(status)) {
                return res.status(400).json({ 
                    message: 'Please provide valid status (accepted or declined)' 
                });
            }

            const isParticipant = await Participant.isParticipant(meetingId, userId);
            
            if (!isParticipant) {
                return res.status(403).json({ 
                    message: 'You are not invited to this meeting' 
                });
            }

            await Participant.updateStatus(meetingId, userId, status);

            res.status(200).json({
                message: `Meeting ${status} successfully`
            });

        } catch (error) {
            console.error('Update status error:', error);
            res.status(500).json({ 
                message: 'Error updating meeting status' 
            });
        }
    },

    // Remove participant from meeting (creator only)
    async removeParticipant(req, res) {
        try {
            const meetingId = req.params.id;
            const participantId = req.params.userId;
            const userId = req.user.userId;

            // Check if user is the creator
            const isCreator = await Meeting.isCreator(meetingId, userId);
            if (!isCreator) {
                return res.status(403).json({ 
                    message: 'Only the meeting creator can remove participants' 
                });
            }

            // Check if participant exists in meeting
            const isParticipant = await Participant.isParticipant(meetingId, participantId);
            if (!isParticipant) {
                return res.status(404).json({ 
                    message: 'User is not a participant of this meeting' 
                });
            }

            // Remove participant
            await Participant.removeParticipant(meetingId, participantId);

            res.status(200).json({
                message: 'Participant removed successfully'
            });

        } catch (error) {
            console.error('Remove participant error:', error);
            res.status(500).json({ 
                message: 'Error removing participant' 
            });
        }
    },


    // Get dashboard statistics
    async getDashboardStats(req, res) {
        try {
            const userId = req.user.userId;
            
            // Get all user meetings first (we'll use this data for stats)
            const meetings = await Meeting.getUserMeetings(userId);
            
            // Calculate statistics
            const now = new Date();
            const today = now.toISOString().split('T')[0]; // YYYY-MM-DD
            const currentTime = now.toTimeString().split(' ')[0]; // HH:MM:SS

            const stats = {
                totalMeetings: meetings.length,
                createdByMe: 0,
                invitedTo: 0,
                upcomingMeetings: 0,
                pastMeetings: 0,
                todayMeetings: 0,
                pendingInvitations: 0,
                acceptedInvitations: 0,
                declinedInvitations: 0
            };

            meetings.forEach(meeting => {
                // Count created vs invited
                if (meeting.user_role === 'creator') {
                    stats.createdByMe++;
                } else {
                    stats.invitedTo++;
                }

                // Count by date
                const meetingDate = new Date(meeting.date);
                const meetingDateTime = new Date(`${meeting.date}T${meeting.time}`);
                
                if (meetingDate.toDateString() === now.toDateString()) {
                    stats.todayMeetings++;
                }

                if (meetingDateTime > now) {
                    stats.upcomingMeetings++;
                } else if (meetingDateTime < now) {
                    stats.pastMeetings++;
                }

                // Count invitation status (only for meetings where user is participant)
                if (meeting.user_role === 'participant') {
                    if (meeting.participant_status === 'pending') {
                        stats.pendingInvitations++;
                    } else if (meeting.participant_status === 'accepted') {
                        stats.acceptedInvitations++;
                    } else if (meeting.participant_status === 'declined') {
                        stats.declinedInvitations++;
                    }
                }
            });

            // Get upcoming meetings (next 5)
            const upcomingMeetings = meetings
                .filter(meeting => {
                    const meetingDateTime = new Date(`${meeting.date}T${meeting.time}`);
                    return meetingDateTime > now;
                })
                .sort((a, b) => {
                    const dateA = new Date(`${a.date}T${a.time}`);
                    const dateB = new Date(`${b.date}T${b.time}`);
                    return dateA - dateB;
                })
                .slice(0, 5);

            // Get pending invitations
            const pendingMeetings = meetings
                .filter(meeting => 
                    meeting.user_role === 'participant' && 
                    meeting.participant_status === 'pending'
                )
                .slice(0, 5);

            res.status(200).json({
                message: 'Dashboard statistics retrieved successfully',
                stats,
                upcomingMeetings,
                pendingInvitations: pendingMeetings
            });

        } catch (error) {
            console.error('Dashboard stats error:', error);
            res.status(500).json({ 
                message: 'Error retrieving dashboard statistics' 
            });
        }
    },

    // Search meetings with filters
    async searchMeetings(req, res) {
        try {
            const userId = req.user.userId;
            const { 
                query,        // Search in title/description
                status,       // 'upcoming', 'past', 'today'
                role,         // 'creator', 'participant'
                participantStatus, // 'pending', 'accepted', 'declined'
                fromDate,
                toDate,
                limit = 20,
                offset = 0
            } = req.query;

            // Get all user meetings
            let meetings = await Meeting.getUserMeetings(userId);
            
            // Get participants for each meeting (for search in participant names)
            const meetingsWithDetails = await Promise.all(
                meetings.map(async (meeting) => {
                    const participants = await Participant.getMeetingParticipants(meeting.id);
                    return {
                        ...meeting,
                        participants
                    };
                })
            );

            // Apply filters
            let filteredMeetings = meetingsWithDetails;

            // Text search (in title, description, or participant names)
            if (query) {
                const searchTerm = query.toLowerCase();
                filteredMeetings = filteredMeetings.filter(meeting => {
                    // Search in title
                    if (meeting.title.toLowerCase().includes(searchTerm)) return true;
                    
                    // Search in description
                    if (meeting.description && meeting.description.toLowerCase().includes(searchTerm)) return true;
                    
                    // Search in participant names
                    const matchingParticipant = meeting.participants.some(p => 
                        p.name.toLowerCase().includes(searchTerm)
                    );
                    if (matchingParticipant) return true;
                    
                    return false;
                });
            }

            // Filter by date status
            if (status) {
                const now = new Date();
                filteredMeetings = filteredMeetings.filter(meeting => {
                    const meetingDateTime = new Date(`${meeting.date}T${meeting.time}`);
                    
                    if (status === 'upcoming') return meetingDateTime > now;
                    if (status === 'past') return meetingDateTime < now;
                    if (status === 'today') {
                        const today = now.toISOString().split('T')[0];
                        return meeting.date === today;
                    }
                    return true;
                });
            }

            // Filter by role
            if (role) {
                filteredMeetings = filteredMeetings.filter(meeting => 
                    meeting.user_role === role
                );
            }

            // Filter by participant status
            if (participantStatus) {
                filteredMeetings = filteredMeetings.filter(meeting => 
                    meeting.user_role === 'participant' && 
                    meeting.participant_status === participantStatus
                );
            }

            // Filter by date range
            if (fromDate) {
                filteredMeetings = filteredMeetings.filter(meeting => 
                    meeting.date >= fromDate
                );
            }
            if (toDate) {
                filteredMeetings = filteredMeetings.filter(meeting => 
                    meeting.date <= toDate
                );
            }

            // Sort by date (most recent first)
            filteredMeetings.sort((a, b) => {
                const dateA = new Date(`${a.date}T${a.time}`);
                const dateB = new Date(`${b.date}T${b.time}`);
                return dateB - dateA;
            });

            // Pagination
            const total = filteredMeetings.length;
            const paginatedMeetings = filteredMeetings.slice(offset, offset + limit);

            res.status(200).json({
                message: 'Meetings searched successfully',
                meetings: paginatedMeetings,
                pagination: {
                    total,
                    limit: parseInt(limit),
                    offset: parseInt(offset),
                    hasMore: offset + limit < total
                }
            });

        } catch (error) {
            console.error('Search meetings error:', error);
            res.status(500).json({ 
                message: 'Error searching meetings' 
            });
        }
    },

    // Get meetings by date (for calendar view)
    async getMeetingsByDate(req, res) {
        try {
            const userId = req.user.userId;
            const { date } = req.params; // Format: YYYY-MM-DD

            if (!date) {
                return res.status(400).json({ 
                    message: 'Please provide a date' 
                });
            }

            // Get all user meetings
            const meetings = await Meeting.getUserMeetings(userId);
            
            // Filter meetings for the specified date
            const dayMeetings = meetings.filter(meeting => meeting.date === date);

            // Get participants for each meeting
            const meetingsWithParticipants = await Promise.all(
                dayMeetings.map(async (meeting) => {
                    const participants = await Participant.getMeetingParticipants(meeting.id);
                    return {
                        ...meeting,
                        participants
                    };
                })
            );

            // Sort by time
            meetingsWithParticipants.sort((a, b) => {
                if (a.time < b.time) return -1;
                if (a.time > b.time) return 1;
                return 0;
            });

            res.status(200).json({
                message: `Meetings for ${date}`,
                date,
                meetings: meetingsWithParticipants,
                total: meetingsWithParticipants.length
            });

        } catch (error) {
            console.error('Get meetings by date error:', error);
            res.status(500).json({ 
                message: 'Error retrieving meetings for this date' 
            });
        }
    },



    //  chat history for a meeting
   async  getChatHistory(req, res) {
    try {
        const meetingId = req.params.id;
        const userId = req.user.userId;
        const { limit = 50, before } = req.query;

        // Check if user has access to this meeting
        const meeting = await Meeting.findById(meetingId);
        if (!meeting) {
            return res.status(404).json({ message: 'Meeting not found' });
        }

        const isParticipant = await Participant.isParticipant(meetingId, userId);
        if (meeting.created_by !== userId && !isParticipant) {
            return res.status(403).json({ message: 'Access denied' });
        }

        // For now, return empty array (you can implement message storage later)
        // In production, you'd store messages in database
        res.status(200).json({
            message: 'Chat history retrieved',
            messages: [] // Placeholder - implement message storage if needed
        });

    } catch (error) {
        console.error('Get chat history error:', error);
        res.status(500).json({ message: 'Error retrieving chat history' });
    }
}



};

module.exports = meetingController;