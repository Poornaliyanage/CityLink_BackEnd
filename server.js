import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createUserTableIfNotExists, checkUserTable } from './utils/dbCheck.js';

dotenv.config();

const app = express();

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'exp://172.20.10.5:*'],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Initialize database on startup
const initializeDatabase = async () => {
  await createUserTableIfNotExists();
  await checkUserTable();
};

// Import routes
import authRoutes from './routes/auth.js';

// Routes
app.use('/api/auth', authRoutes);

// Health check route with DB status
app.get('/api/health', async (req, res) => {
  try {
    const pool = (await import('./config/database.js')).default;
    const [rows] = await pool.execute('SELECT 1 as db_status');
    
    res.status(200).json({ 
      success: true,
      message: 'CityLink API is running!',
      database: 'Connected ✅',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV
    });
  } catch (error) {
    res.status(200).json({ 
      success: true,
      message: 'CityLink API is running!',
      database: 'Disconnected ❌',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      error: error.message
    });
  }
});

// Database info route (for debugging)
app.get('/api/db-info', async (req, res) => {
  try {
    const pool = (await import('./config/database.js')).default;
    const [users] = await pool.execute('SELECT COUNT(*) as user_count FROM users');
    const [tables] = await pool.execute('SHOW TABLES');
    
    res.json({
      success: true,
      database: process.env.DB_NAME,
      user_count: users[0].user_count,
      tables: tables.map(t => Object.values(t)[0]),
      connection: 'Active'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Database connection failed',
      error: error.message
    });
  }
});

// Root route
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Welcome to CityLink Backend API',
    version: '1.0.0',
    database: 'FreeSQLDatabase.com',
    endpoints: {
      auth: {
        register: 'POST /api/auth/register',
        login: 'POST /api/auth/login',
        profile: 'GET /api/auth/me'
      },
      utility: {
        health: 'GET /api/health',
        db_info: 'GET /api/db-info'
      }
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error Stack:', err.stack);
  res.status(500).json({ 
    success: false,
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : {}
  });
});

// 404 handler - FIXED: Use proper express 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

const PORT = process.env.PORT || 5000;

// Start server after DB initialization
const startServer = async () => {
  await initializeDatabase();
  
  app.listen(PORT, () => {
    console.log(`🚀 CityLink server running on port ${PORT}`);
    console.log(`🌐 Environment: ${process.env.NODE_ENV}`);
    console.log(`📊 Database: ${process.env.DB_NAME} @ ${process.env.DB_HOST}`);
    console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
  });
};

startServer();