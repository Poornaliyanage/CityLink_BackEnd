import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../config/database.js';

// Base User class
class User {
  constructor(userData) {
    this.user_id = userData.user_id;
    this.name = userData.name;
    this.email = userData.email;
    this.role = userData.role;
    this.phone_no = userData.phone_no;
    this.nic = userData.NIC || userData.nic;
    this.is_active = userData.is_active;
    this.created_at = userData.created_at;
    this.updated_at = userData.updated_at;
  }

  // Static method to create user from raw database data
  static fromDatabase(dbData) {
    return new User(dbData);
  }

  // Method to get safe user data (without sensitive information)
  getSafeData() {
    return {
      user_id: this.user_id,
      name: this.name,
      email: this.email,
      role: this.role,
      phone_no: this.phone_no,
      nic: this.nic,
      is_active: this.is_active,
      created_at: this.created_at,
      updated_at: this.updated_at
    };
  }

  // Method to get first name
  getFirstName() {
    return this.name.split(' ')[0];
  }
}

// Authentication Service class
class AuthService {
  constructor() {
    this.saltRounds = 12;
  }

  async hashPassword(password) {
    return await bcrypt.hash(password, this.saltRounds);
  }

  async comparePassword(password, hashedPassword) {
    return await bcrypt.compare(password, hashedPassword);
  }

  generateToken(userId) {
    return jwt.sign(
      { user_id: userId },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );
  }

  verifyToken(token) {
    return jwt.verify(token, process.env.JWT_SECRET);
  }
}

// User Repository class for database operations
class UserRepository {
  constructor() {
    this.pool = pool;
  }

  async getUserByEmailOrNIC(email, nicPassport) {
    const [users] = await this.pool.execute(
      'SELECT user_id FROM users WHERE email = ? OR NIC = ?',
      [email, nicPassport]
    );
    return users;
  }

  async getUserByEmail(email) {
    const [users] = await this.pool.execute(
      `SELECT user_id, name, email, password, role, phone_no, NIC, is_active, created_at 
       FROM users WHERE email = ? AND auth_type = 'email'`,
      [email]
    );
    return users;
  }

  async getUserById(userId) {
    const [users] = await this.pool.execute(
      `SELECT user_id, name, email, role, phone_no, NIC, is_active, created_at, updated_at 
       FROM users WHERE user_id = ?`,
      [userId]
    );
    return users;
  }

  async createUser(userData) {
    const { fullName, email, hashedPassword, nicPassport, contactNumber, role } = userData;
    
    const [result] = await this.pool.execute(
      `INSERT INTO users (name, email, password, NIC, phone_no, role, auth_type, is_active) 
       VALUES (?, ?, ?, ?, ?, ?, 'email', 1)`,
      [fullName, email, hashedPassword, nicPassport, contactNumber, role]
    );

    return result;
  }

  async getConnection() {
    return await this.pool.getConnection();
  }
}

// Main AuthController class
class AuthController {
  constructor() {
    this.authService = new AuthService();
    this.userRepository = new UserRepository();
  }

  // Register new user
  async register(req, res) {
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

      // Get connection for transaction
      connection = await this.userRepository.getConnection();

      // Check if user already exists
      const existingUsers = await this.userRepository.getUserByEmailOrNIC(email, nicPassport);
      
      if (existingUsers.length > 0) {
        return this.sendErrorResponse(res, 400, 'User already exists with this email or NIC/Passport');
      }

      // Hash password
      const hashedPassword = await this.authService.hashPassword(password);

      // Combine first and last name
      const fullName = `${firstName} ${lastName}`;

      // Create user data object
      const userData = {
        fullName,
        email,
        hashedPassword,
        nicPassport,
        contactNumber,
        role
      };

      // Insert user into database
      const result = await this.userRepository.createUser(userData);

      // Generate JWT token
      const token = this.authService.generateToken(result.insertId);

      // Get created user data
      const [users] = await this.userRepository.getUserById(result.insertId);
      const user = User.fromDatabase(users[0]);

      this.sendSuccessResponse(res, 201, {
        message: `Welcome to CityLink, ${user.getFirstName()}! Your ${role} account has been created successfully.`,
        token,
        user: user.getSafeData()
      });

    } catch (error) {
      this.handleError(res, error, 'Registration error:');
    } finally {
      if (connection) {
        connection.release();
      }
    }
  }

  // Login user
  async login(req, res) {
    try {
      const { email, password } = req.body;

      // Find user by email
      const users = await this.userRepository.getUserByEmail(email);

      if (users.length === 0) {
        return this.sendErrorResponse(res, 400, 'Invalid email or password');
      }

      const dbUser = users[0];
      const user = User.fromDatabase(dbUser);

      // Check if user is active
      if (!user.is_active) {
        return this.sendErrorResponse(res, 400, 'Your account has been deactivated. Please contact support.');
      }

      // Verify password
      const isPasswordValid = await this.authService.comparePassword(password, dbUser.password);
      if (!isPasswordValid) {
        return this.sendErrorResponse(res, 400, 'Invalid email or password');
      }

      // Generate JWT token
      const token = this.authService.generateToken(user.user_id);

      this.sendSuccessResponse(res, 200, {
        message: `Welcome back, ${user.getFirstName()}!`,
        token,
        user: user.getSafeData()
      });

    } catch (error) {
      this.handleError(res, error, 'Login error:');
    }
  }

  // Get current user profile
  async getProfile(req, res) {
    try {
      const users = await this.userRepository.getUserById(req.user.user_id);

      if (users.length === 0) {
        return this.sendErrorResponse(res, 404, 'User not found');
      }

      const user = User.fromDatabase(users[0]);

      this.sendSuccessResponse(res, 200, {
        user: user.getSafeData()
      });

    } catch (error) {
      this.handleError(res, error, 'Get profile error:');
    }
  }

  // Utility methods for response handling
  sendSuccessResponse(res, statusCode, data) {
    res.status(statusCode).json({
      success: true,
      ...data
    });
  }

  sendErrorResponse(res, statusCode, message, error = null) {
    const response = {
      success: false,
      message
    };

    if (error && process.env.NODE_ENV === 'development') {
      response.error = error;
    }

    res.status(statusCode).json(response);
  }

  handleError(res, error, logMessage) {
    console.error(logMessage, error);
    
    if (error.code === 'ER_DUP_ENTRY') {
      return this.sendErrorResponse(res, 400, 'User already exists with this email or NIC');
    }
    
    this.sendErrorResponse(
      res, 
      500, 
      'Server error during operation',
      process.env.NODE_ENV === 'development' ? error.message : null
    );
  }
}

// Create singleton instance
const authController = new AuthController();

// Export individual methods for use in routes
export const register = (req, res) => authController.register(req, res);
export const login = (req, res) => authController.login(req, res);
export const getProfile = (req, res) => authController.getProfile(req, res);

// Export classes for testing and extension
export { User, AuthService, UserRepository, AuthController };

export default {
  register,
  login,
  getProfile
};