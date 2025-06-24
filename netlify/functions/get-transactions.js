const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

exports.handler = async function(event) {
    try {
        const result = await pool.query('SELECT * FROM transactions ORDER BY date DESC, created_at DESC');
        return { statusCode: 200, body: JSON.stringify(result.rows) };
    } catch (error) {
        return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
    }
};
