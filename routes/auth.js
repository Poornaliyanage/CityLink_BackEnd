import express from 'express';
import authController from '../controllers/authController.js';
import auth from '../middleware/auth.js';
import { 
  validateRegistration, 
  validateLogin, 
  handleValidationErrors 
} from '../middleware/validation.js';

const router = express.Router();

// @route   POST /api/auth/register
// @desc    Register new user
// @access  Public
router.post(
  '/register', 
  validateRegistration, 
  handleValidationErrors, 
  authController.register
);

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post(
  '/login', 
  validateLogin, 
  handleValidationErrors, 
  authController.login
);

// @route   GET /api/auth/me
// @desc    Get current user profile
// @access  Private
router.get('/me', auth, authController.getProfile);

export default router;