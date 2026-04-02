
const db = require('../config/database');

class MessageStore {
    async saveMessage(messageData) {
        const { meetingId, userId, message, type = 'user' } = messageData;
        
        const query = `
            INSERT INTO meeting_messages (meeting_id, user_id, message, type)
            VALUES (?, ?, ?, ?)
        `;
        
        const [result] = await db.query(query, [meetingId, userId, message, type]);
        return result.insertId;
    }

    async getMessages(meetingId, limit = 50, before = null) {
        let query = `
            SELECT 
                mm.*,
                u.name as user_name,
                u.email as user_email
            FROM meeting_messages mm
            JOIN users u ON mm.user_id = u.id
            WHERE mm.meeting_id = ?
            ORDER BY mm.created_at DESC
            LIMIT ?
        `;
        
        const [rows] = await db.query(query, [meetingId, limit]);
        return rows.reverse(); // Return in chronological order
    }
}

module.exports = new MessageStore();