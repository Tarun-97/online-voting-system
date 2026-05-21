const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// TC01 & TC02: User Registration (Prevent duplicate Voter ID & Email)
router.post('/register', async (req, res) => {
  try {
    const { voterID, name, email, dateOfBirth, password, confirmPassword } = req.body;

    // Validation
    if (!voterID || !name || !email || !dateOfBirth || !password) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required',
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Passwords do not match',
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long',
      });
    }

    // TC02: Check for duplicate Voter ID
    const existingVoterID = await User.findOne({ voterID });
    if (existingVoterID) {
      return res.status(400).json({
        success: false,
        message: 'Voter ID already registered. Please use a different Voter ID.',
      });
    }

    // Check for duplicate email
    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      return res.status(400).json({
        success: false,
        message: 'Email already registered. Please use a different email.',
      });
    }

    // Create new user
    const newUser = new User({
      voterID,
      name,
      email,
      dateOfBirth: new Date(dateOfBirth),
      password,
      role: 'voter',
    });

    await newUser.save();

    return res.status(201).json({
      success: true,
      message: 'Registration successful! Please log in.',
      user: {
        id: newUser._id,
        voterID: newUser.voterID,
        name: newUser.name,
        email: newUser.email,
      },
    });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error during registration',
      error: error.message,
    });
  }
});

// TC03 & TC04: User Login (Valid & Invalid credentials)
router.post('/login', async (req, res) => {
  try {
    const { voterID, password } = req.body;

    // Validation
    if (!voterID || !password) {
      return res.status(400).json({
        success: false,
        message: 'Voter ID and password are required',
      });
    }

    // Find user by Voter ID
    const user = await User.findOne({ voterID });

    // TC04: Invalid credentials
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid Voter ID or password',
      });
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid Voter ID or password',
      });
    }

    // TC03: Generate JWT token on successful login
    const token = jwt.sign(
      {
        id: user._id,
        voterID: user.voterID,
        role: user.role,
        hasVoted: user.hasVoted,
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        voterID: user.voterID,
        name: user.name,
        email: user.email,
        role: user.role,
        hasVoted: user.hasVoted,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error during login',
      error: error.message,
    });
  }
});

// Get current user info (for TC17: Session validation)
router.get('/me', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided',
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    return res.status(200).json({
      success: true,
      user: {
        id: user._id,
        voterID: user.voterID,
        name: user.name,
        email: user.email,
        role: user.role,
        hasVoted: user.hasVoted,
      },
    });
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Token expired or invalid',
    });
  }
});

// Logout (TC17: Session expires after logout)
router.post('/logout', (req, res) => {
  // Client should remove token from localStorage
  return res.status(200).json({
    success: true,
    message: 'Logged out successfully',
  });
});

module.exports = router;