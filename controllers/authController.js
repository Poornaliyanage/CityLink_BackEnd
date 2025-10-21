const User = require('../models/userModel');
const admin = require('../config/firebase');

const authController = {
  // Register/Sync user with MySQL after Firebase auth
  syncUser: async (req, res) => {
    try {
      const { firebase_uid, email, name, phone_number, profile_picture } = req.body;

      // Check if user already exists
      const existingUser = await User.getUserByFirebaseUid(firebase_uid);
      
      if (existingUser) {
        return res.status(200).json({
          success: true,
          message: 'User already exists',
          user: existingUser
        });
      }

      // Create new user in MySQL
      const userId = await User.createUser({
        firebase_uid,
        email,
        name,
        phone_number,
        profile_picture
      });

      const newUser = await User.getUserById(userId);

      res.status(201).json({
        success: true,
        message: 'User synchronized successfully',
        user: newUser
      });
    } catch (error) {
      console.error('Sync user error:', error);
      res.status(500).json({
        success: false,
        message: 'Error synchronizing user',
        error: error.message
      });
    }
  },

  // Get current user profile
  getCurrentUser: async (req, res) => {
    try {
      if (!req.dbUser) {
        return res.status(404).json({
          success: false,
          message: 'User not found in database'
        });
      }

      res.status(200).json({
        success: true,
        user: req.dbUser
      });
    } catch (error) {
      console.error('Get current user error:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching user data',
        error: error.message
      });
    }
  },

  // Verify Firebase token
  verifyToken: async (req, res) => {
    try {
      res.status(200).json({
        success: true,
        message: 'Token is valid',
        user: req.user
      });
    } catch (error) {
      res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }
  }
};

module.exports = authController;