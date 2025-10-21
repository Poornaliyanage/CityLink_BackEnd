const admin = require('../config/firebase');
const { pool } = require('../config/database');

const verifyFirebaseToken = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.'
      });
    }

    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = decodedToken;
    
    // Get user from database
    const [users] = await pool.execute(
      'SELECT * FROM users WHERE firebase_uid = ?',
      [decodedToken.uid]
    );

    if (users.length > 0) {
      req.dbUser = users[0];
    }

    next();
  } catch (error) {
    console.error('Token verification error:', error);
    return res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }
};

const optionalAuth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (token) {
      const decodedToken = await admin.auth().verifyIdToken(token);
      req.user = decodedToken;
      
      const [users] = await pool.execute(
        'SELECT * FROM users WHERE firebase_uid = ?',
        [decodedToken.uid]
      );

      if (users.length > 0) {
        req.dbUser = users[0];
      }
    }
    
    next();
  } catch (error) {
    next();
  }
};

module.exports = { verifyFirebaseToken, optionalAuth };