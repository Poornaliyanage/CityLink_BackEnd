import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../config/database.js';

// Register new user
export const register = async (req, res) => {
  let connection;
  try {
    const {
      firstName,
      lastName,
      email,
      password,
      nicPassport,
      contactNumber,
      role
    } = req.body;

    // Get connection from pool for transaction
    connection = await pool.getConnection();

    // Check if user already exists
    const [existingUsers] = await connection.execute(
      'SELECT user_id FROM users WHERE email = ? OR NIC = ?',
      [email, nicPassport]
    );

    if (existingUsers.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email or NIC/Passport'
      });
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Combine first and last name
    const fullName = `${firstName} ${lastName}`;

    // Insert user into database
    const [result] = await connection.execute(
      `INSERT INTO users (name, email, password, NIC, phone_no, role, auth_type, is_active) 
       VALUES (?, ?, ?, ?, ?, ?, 'email', 1)`,
      [fullName, email, hashedPassword, nicPassport, contactNumber, role]
    );

    // Generate JWT token
    const token = jwt.sign(
      { user_id: result.insertId },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    // Get created user data (excluding password)
    const [users] = await connection.execute(
      `SELECT user_id, name, email, role, phone_no, NIC, is_active, created_at 
       FROM users WHERE user_id = ?`,
      [result.insertId]
    );

    const user = users[0];

    res.status(201).json({
      success: true,
      message: `Welcome to CityLink, ${firstName}! Your ${role} account has been created successfully.`,
      token,
      user: {
        user_id: user.user_id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone_no: user.phone_no,
        nic: user.NIC,
        is_active: user.is_active,
        created_at: user.created_at
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email or NIC'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Server error during registration',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
};

// Login user
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user by email
    const [users] = await pool.execute(
      `SELECT user_id, name, email, password, role, phone_no, NIC, is_active, created_at 
       FROM users WHERE email = ? AND auth_type = 'email'`,
      [email]
    );

    if (users.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    const user = users[0];

    // Check if user is active
    if (!user.is_active) {
      return res.status(400).json({
        success: false,
        message: 'Your account has been deactivated. Please contact support.'
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { user_id: user.user_id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    res.json({
      success: true,
      message: `Welcome back, ${user.name.split(' ')[0]}!`,
      token,
      user: {
        user_id: user.user_id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone_no: user.phone_no,
        nic: user.NIC,
        is_active: user.is_active,
        created_at: user.created_at
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login',
      error: process.env.NODE_ENV === 'development' ? error.message : {}
    });
  }
};

// Get current user profile
export const getProfile = async (req, res) => {
  try {
    const [users] = await pool.execute(
      `SELECT user_id, name, email, role, phone_no, NIC, is_active, created_at, updated_at 
       FROM users WHERE user_id = ?`,
      [req.user.user_id]
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const user = users[0];
    
    res.json({
      success: true,
      user: {
        user_id: user.user_id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone_no: user.phone_no,
        nic: user.NIC,
        is_active: user.is_active,
        created_at: user.created_at,
        updated_at: user.updated_at
      }
    });

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching profile'
    });
  }
};

export default {
  register,
  login,
  getProfile
};