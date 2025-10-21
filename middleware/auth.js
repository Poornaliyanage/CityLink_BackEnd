import jwt from 'jsonwebtoken';
import pool from '../config/database.js';

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided, authorization denied'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get user from database
    const [users] = await pool.execute(
      `SELECT user_id, name, email, role, phone_no, is_active 
       FROM users WHERE user_id = ? AND is_active = 1`,
      [decoded.user_id]
    );

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Token is not valid or user is inactive'
      });
    }

    req.user = users[0];
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(401).json({
      success: false,
      message: 'Token is not valid'
    });
  }
};

export default auth;