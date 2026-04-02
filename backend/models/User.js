const db = require('../config/database');

class User {
    // Create a new user
    async create(userData) {
        const { name, email, password } = userData;
        
        const query = 'INSERT INTO users (name, email, password) VALUES (?, ?, ?)';
        const [result] = await db.query(query, [name, email, password]);
        
        return result.insertId; // Return the new user's ID
    }

    // Find user by email (for login and duplicate check)
    async findByEmail(email) {
        const query = 'SELECT * FROM users WHERE email = ?';
        const [rows] = await db.query(query, [email]);
        
        return rows[0]; // Return first matching user (email is unique)
    }

    // Find user by ID
    async findById(id) {
        const query = 'SELECT id, name, email, created_at FROM users WHERE id = ?';
        const [rows] = await db.query(query, [id]);
        
        return rows[0]; // Return user without password
    }
}

module.exports = new User();