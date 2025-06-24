// netlify/functions/setup-database.js
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

exports.handler = async function(event, context) {
  try {
    const client = await pool.connect();
    // Tạo bảng transactions nếu nó chưa tồn tại
    await client.query(`
      CREATE TABLE IF NOT EXISTS transactions (
        id SERIAL PRIMARY KEY,
        amount NUMERIC(15, 2) NOT NULL,
        category VARCHAR(50) NOT NULL,
        note TEXT,
        date DATE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    client.release();
    return {
      statusCode: 200,
      body: 'Database setup complete! Bảng "transactions" đã được tạo thành công.',
    };
  } catch (error) {
    console.error(error);
    return { statusCode: 500, body: JSON.stringify({ error: 'Failed to set up database.' }) };
  }
};
