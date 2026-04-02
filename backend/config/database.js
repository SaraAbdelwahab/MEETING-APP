const mysql = require('mysql2');

// Create a connection pool (recommended for production)
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Convert pool to use promises (so we can use async/await)
const promisePool = pool.promise();

// Test the connection
(async () => {
    try {
        const [rows] = await promisePool.query('SELECT 1');
        console.log(' Database connected successfully');
    } catch (error) {
        console.error('Database connection failed:', error.message);
        process.exit(1); // Exit if database connection fails
    }
})();

module.exports = promisePool;