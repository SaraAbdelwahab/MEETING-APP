const db = require('../config/database');

class Participant {
    // Add participants to a meeting
    async addParticipants(meetingId, userIds) {
        // Create array of [meetingId, userId] pairs
        const values = userIds.map(userId => [meetingId, userId]);
        
        const query = 'INSERT INTO meeting_participants (meeting_id, user_id) VALUES ?';
        const [result] = await db.query(query, [values]);
        
        return result.affectedRows;
    }

    // Get all participants for a meeting with their details
    async getMeetingParticipants(meetingId) {
        const query = `
            SELECT 
                u.id,
                u.name,
                u.email,
                mp.status,
                mp.created_at as invited_at
            FROM meeting_participants mp
            JOIN users u ON mp.user_id = u.id
            WHERE mp.meeting_id = ?
            ORDER BY mp.status, u.name
        `;
        
        const [rows] = await db.query(query, [meetingId]);
        return rows;
    }

    // Update participant status (accept/decline)
    async updateStatus(meetingId, userId, status) {
        const query = `
            UPDATE meeting_participants 
            SET status = ? 
            WHERE meeting_id = ? AND user_id = ?
        `;
        
        const [result] = await db.query(query, [status, meetingId, userId]);
        return result.affectedRows > 0;
    }

    // Check if user is participant of meeting
    async isParticipant(meetingId, userId) {
        const query = `
            SELECT * FROM meeting_participants 
            WHERE meeting_id = ? AND user_id = ?
        `;
        
        const [rows] = await db.query(query, [meetingId, userId]);
        return rows.length > 0;
    }

    // Remove participant from meeting
    async removeParticipant(meetingId, userId) {
        const query = `
            DELETE FROM meeting_participants 
            WHERE meeting_id = ? AND user_id = ?
        `;
        
        const [result] = await db.query(query, [meetingId, userId]);
        return result.affectedRows > 0;
    }
}

module.exports = new Participant();