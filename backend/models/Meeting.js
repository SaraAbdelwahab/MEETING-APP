const db = require('../config/database');

class Meeting {
    // Create a new meeting
    async create(meetingData, createdBy) {
        const { title, description, date, time, duration } = meetingData;
        
        const query = `
            INSERT INTO meetings 
            (title, description, date, time, duration, created_by) 
            VALUES (?, ?, ?, ?, ?, ?)
        `;
        
        const [result] = await db.query(query, [
            title, 
            description, 
            date, 
            time, 
            duration, 
            createdBy
        ]);
        
        return result.insertId;
    }

    // Get meeting by ID with creator details
    async findById(meetingId) {
        const query = `
            SELECT 
                m.*,
                u.name as creator_name,
                u.email as creator_email
            FROM meetings m
            JOIN users u ON m.created_by = u.id
            WHERE m.id = ?
        `;
        
        const [rows] = await db.query(query, [meetingId]);
        return rows[0];
    }

    // Get all meetings for a user (both created and invited)
    async getUserMeetings(userId) {
        const query = `
            SELECT DISTINCT
                m.*,
                u.name as creator_name,
                CASE 
                    WHEN m.created_by = ? THEN 'creator'
                    ELSE 'participant'
                END as user_role,
                mp.status as participant_status
            FROM meetings m
            JOIN users u ON m.created_by = u.id
            LEFT JOIN meeting_participants mp ON m.id = mp.meeting_id AND mp.user_id = ?
            WHERE m.created_by = ? OR mp.user_id = ?
            ORDER BY m.date DESC, m.time DESC
        `;
        
        const [rows] = await db.query(query, [userId, userId, userId, userId]);
        return rows;
    }

    // Update meeting
    async update(meetingId, meetingData) {
        const { title, description, date, time, duration } = meetingData;
        
        const query = `
            UPDATE meetings 
            SET title = ?, description = ?, date = ?, time = ?, duration = ?
            WHERE id = ?
        `;
        
        const [result] = await db.query(query, [
            title, description, date, time, duration, meetingId
        ]);
        
        return result.affectedRows > 0;
    }

    // Delete meeting
    async delete(meetingId) {
        const query = 'DELETE FROM meetings WHERE id = ?';
        const [result] = await db.query(query, [meetingId]);
        return result.affectedRows > 0;
    }

    // Check if user is the creator of a meeting
    async isCreator(meetingId, userId) {
        const query = 'SELECT * FROM meetings WHERE id = ? AND created_by = ?';
        const [rows] = await db.query(query, [meetingId, userId]);
        return rows.length > 0;
    }
}

module.exports = new Meeting();