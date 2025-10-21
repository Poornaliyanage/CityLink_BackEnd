import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Test database connection
const testConnection = async () => {
  try {
    const connection = await pool.getConnection();
    console.log('✅ Database connected successfully to FreeSQLDatabase.com');
    console.log(`📊 Database: ${process.env.DB_NAME}`);
    connection.release();
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    console.log('💡 Please check:');
    console.log('   - Internet connection');
    console.log('   - Database credentials');
    console.log('   - Whitelisted IP addresses in FreeSQLDatabase');
    process.exit(1);
  }
};

testConnection();

export { pool };
export default pool;