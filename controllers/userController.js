const User = require('../models/userModel');

const userController = {
  // Update user profile
  updateProfile: async (req, res) => {
    try {
      const userId = req.dbUser.id;
      const updateData = req.body;

      const updated = await User.updateUser(userId, updateData);

      if (!updated) {
        return res.status(404).json({
          success: false,
          message: 'User not found or no changes made'
        });
      }

      const updatedUser = await User.getUserById(userId);

      res.status(200).json({
        success: true,
        message: 'Profile updated successfully',
        user: updatedUser
      });
    } catch (error) {
      console.error('Update profile error:', error);
      res.status(500).json({
        success: false,
        message: 'Error updating profile',
        error: error.message
      });
    }
  },

  // Delete user account
  deleteAccount: async (req, res) => {
    try {
      const userId = req.dbUser.id;
      const firebaseUid = req.user.uid;

      // Delete from MySQL
      const deleted = await User.deleteUser(userId);

      if (!deleted) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      // Optionally delete from Firebase (you might want to handle this differently)
      // await admin.auth().deleteUser(firebaseUid);

      res.status(200).json({
        success: true,
        message: 'Account deleted successfully'
      });
    } catch (error) {
      console.error('Delete account error:', error);
      res.status(500).json({
        success: false,
        message: 'Error deleting account',
        error: error.message
      });
    }
  },

  // Get user by ID (public profile)
  getUserById: async (req, res) => {
    try {
      const userId = req.params.id;
      const user = await User.getUserById(userId);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }

      res.status(200).json({
        success: true,
        user
      });
    } catch (error) {
      console.error('Get user by ID error:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching user',
        error: error.message
      });
    }
  }
};

module.exports = userController;