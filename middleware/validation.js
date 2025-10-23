// Custom validation middleware (without express-validator)

export const validateRegistration = [
  (req, res, next) => {
    const {
      firstName,
      lastName,
      email,
      password,
      nicPassport,
      contactNumber,
      role
    } = req.body;

    const errors = [];

    // First name validation 
    if (!firstName || firstName.trim().length < 2 || firstName.trim().length > 50) {
      errors.push('First name must be between 2 and 50 characters');
    }

    // Last name validation
    if (!lastName || lastName.trim().length < 2 || lastName.trim().length > 50) {
      errors.push('Last name must be between 2 and 50 characters');
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      errors.push('Please provide a valid email');
    }

    // NIC/Passport validation
    if (!nicPassport || nicPassport.trim().length < 5 || nicPassport.trim().length > 20) {
      errors.push('NIC/Passport must be between 5 and 20 characters');
    }

    // Phone validation (simple check)
    const phoneRegex = /^[0-9+\-\s()]{10,15}$/;
    if (!contactNumber || !phoneRegex.test(contactNumber.replace(/\s/g, ''))) {
      errors.push('Please provide a valid phone number');
    }

    // Password validation
    const validRoles = ['Passenger', 'Conductor', 'Bus Owner', 'passenger', 'conductor', 'bus owner', 'BUS OWNER', 'CONDUCTOR', 'PASSENGER'];
    if (!role) {
      errors.push('Please select a role');
    } else {
      // Normalize the role for comparison
      const normalizedRole = role.toLowerCase().trim();
      const normalizedValidRoles = validRoles.map(r => r.toLowerCase());
      
      if (!normalizedValidRoles.includes(normalizedRole)) {
        errors.push('Please select a valid role: Passenger, Conductor, or Bus Owner');
      } else {
        // Convert to proper case for database storage
        if (normalizedRole === 'passenger') req.body.role = 'Passenger';
        else if (normalizedRole === 'conductor') req.body.role = 'Conductor';
        else if (normalizedRole === 'bus owner') req.body.role = 'Bus Owner';
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed 1',
        errors
      });
    }

    // Sanitize data
    req.body.firstName = firstName.trim();
    req.body.lastName = lastName.trim();
    req.body.email = email.toLowerCase().trim();
    req.body.nicPassport = nicPassport.trim();
    req.body.contactNumber = contactNumber.trim();

    next();
  }
];

export const validateLogin = [
  (req, res, next) => {
    const { email, password } = req.body;
    const errors = [];

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      errors.push('Please provide a valid email');
    }

    // Password validation
    if (!password) {
      errors.push('Password is required');
    }

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors
      });
    }

    // Sanitize email
    req.body.email = email.toLowerCase().trim();

    next();
  }
];

export const handleValidationErrors = (req, res, next) => {
  next(); // Not needed with custom validation, but kept for route compatibility
};