const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { sendTokenResponse } = require('../utils/jwt');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

const sanitizeUsername = (value) =>
  (value || 'google_user')
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 24) || 'google_user';

async function createUniqueUsername(seed) {
  const base = sanitizeUsername(seed);
  let candidate = base.length >= 3 ? base : `${base}_user`;
  let suffix = 1;

  while (await User.exists({ username: candidate })) {
    const tail = `_${suffix++}`;
    candidate = `${base.slice(0, 30 - tail.length)}${tail}`;
  }

  return candidate;
}

async function verifyGoogleCredential(credential) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    const error = new Error('Google sign-in is not configured on the server.');
    error.status = 503;
    throw error;
  }

  const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`);
  if (!response.ok) {
    const error = new Error('Google credential could not be verified.');
    error.status = 401;
    throw error;
  }

  const profile = await response.json();
  if (profile.aud !== clientId || profile.email_verified !== 'true' || !profile.email) {
    const error = new Error('Google credential is not valid for this app.');
    error.status = 401;
    throw error;
  }

  return profile;
}

// POST /api/auth/register
router.post(
  '/register',
  [
    body('username')
      .trim()
      .isLength({ min: 3, max: 30 })
      .withMessage('Username must be 3-30 characters')
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

      if (!user || !user.password || !(await user.comparePassword(password))) {
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

// POST /api/auth/google
router.post(
  '/google',
  [body('credential').notEmpty().withMessage('Google credential is required')],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const profile = await verifyGoogleCredential(req.body.credential);
      const email = profile.email.toLowerCase();
      const createdAt = new Date();
      let statusCode = 200;
      let user = await User.findOne({ $or: [{ email }, { googleId: profile.sub }] });

      if (!user) {
        const username = await createUniqueUsername(profile.name || email.split('@')[0]);
        user = await User.create({
          username,
          email,
          googleId: profile.sub,
          authProvider: 'google',
          avatar: profile.picture || null,
          status: 'online',
          lastSeen: createdAt,
        });
        statusCode = 201;
      } else {
        user.googleId = user.googleId || profile.sub;
        user.avatar = user.avatar || profile.picture || null;
        user.status = 'online';
        user.lastSeen = new Date();
        await user.save({ validateBeforeSave: false });
      }

      sendTokenResponse(user, statusCode, res);
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
