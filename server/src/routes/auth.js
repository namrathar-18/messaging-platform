const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { sendTokenResponse } = require('../utils/jwt');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// POST /api/auth/register
router.post(
  '/register',
  [
    body('username')
      .trim()
      .isLength({ min: 3, max: 30 })
      .withMessage('Username must be 3–30 characters')
      .matches(/^[a-zA-Z0-9_]+$/)
      .withMessage('Username can only contain letters, numbers, and underscores'),
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters'),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { username, email, password } = req.body;

      const existingUser = await User.findOne({ $or: [{ email }, { username }] });
      if (existingUser) {
        const field = existingUser.email === email ? 'Email' : 'Username';
        return res.status(409).json({ error: `${field} is already taken.` });
      }

      const user = await User.create({ username, email, password });
      sendTokenResponse(user, 201, res);
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/auth/login
router.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, password } = req.body;
      const user = await User.findOne({ email }).select('+password');

      if (!user || !(await user.comparePassword(password))) {
        return res.status(401).json({ error: 'Invalid email or password.' });
      }

      // Mark user online
      user.status = 'online';
      user.lastSeen = new Date();
      await user.save({ validateBeforeSave: false });

      sendTokenResponse(user, 200, res);
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/auth/logout
router.post('/logout', authenticate, async (req, res, next) => {
  try {
    // Mark user offline
    await User.findByIdAndUpdate(req.user._id, { status: 'offline', lastSeen: new Date() });

    res.cookie('token', 'loggedout', {
      expires: new Date(Date.now() + 1000),
      httpOnly: true,
    });
    res.json({ message: 'Logged out successfully.' });
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/me
router.get('/me', authenticate, (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;
