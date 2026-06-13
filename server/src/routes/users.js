const express = require('express');
const { body, query, validationResult } = require('express-validator');
const User = require('../models/User');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// All user routes require authentication
router.use(authenticate);

// PATCH /api/users/me  - Update own profile
router.patch(
  '/me',
  [
    body('username')
      .optional()
      .trim()
      .isLength({ min: 3, max: 30 })
      .withMessage('Username must be 3-30 characters')
      .matches(/^[a-zA-Z0-9_]+$/)
      .withMessage('Username can only contain letters, numbers, and underscores'),
    body('email').optional().isEmail().normalizeEmail().withMessage('Valid email required'),
    body('avatar').optional({ nullable: true }).isString().trim().isLength({ max: 500 }),
    body('status').optional().isIn(['online', 'away', 'busy', 'offline']).withMessage('Invalid status value.'),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const updates = {};
      ['username', 'email', 'avatar', 'status'].forEach((field) => {
        if (Object.prototype.hasOwnProperty.call(req.body, field)) updates[field] = req.body[field];
      });

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ error: 'No profile updates provided.' });
      }

      if (updates.username || updates.email) {
        const duplicate = await User.findOne({
          _id: { $ne: req.user._id },
          $or: [
            ...(updates.username ? [{ username: updates.username }] : []),
            ...(updates.email ? [{ email: updates.email }] : []),
          ],
        });
        if (duplicate) {
          const field = duplicate.email === updates.email ? 'Email' : 'Username';
          return res.status(409).json({ error: `${field} is already taken.` });
        }
      }

      updates.lastSeen = new Date();
      const user = await User.findByIdAndUpdate(req.user._id, updates, {
        new: true,
        runValidators: true,
      }).select('-password');

      res.json({ user });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/users/search?q=<query>  - Search users by username or email
router.get(
  '/search',
  [query('q').trim().isLength({ min: 1 }).withMessage('Search query required')],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { q } = req.query;
      const regex = new RegExp(q, 'i');

      const users = await User.find({
        $and: [
          { _id: { $ne: req.user._id } },
          { _id: { $nin: req.user.blockedUsers || [] } },
          { $or: [{ username: regex }, { email: regex }] },
        ],
      })
        .select('_id username email avatar status')
        .limit(20);

      res.json({ users });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/users/:id  - Get a user's public profile
router.get('/:id', async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select('_id username email avatar status lastSeen');
    if (!user) return res.status(404).json({ error: 'User not found.' });
    res.json({ user });
  } catch (err) {
    next(err);
  }
});

// POST /api/users/:id/block - Block a user
router.post('/:id/block', async (req, res, next) => {
  try {
    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({ error: 'You cannot block yourself.' });
    }

    const target = await User.findById(req.params.id).select('_id username');
    if (!target) return res.status(404).json({ error: 'User not found.' });

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $addToSet: { blockedUsers: target._id } },
      { new: true }
    ).select('-password');

    res.json({ user, blockedUserId: target._id });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/users/:id/block - Unblock a user
router.delete('/:id/block', async (req, res, next) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $pull: { blockedUsers: req.params.id } },
      { new: true }
    ).select('-password');

    res.json({ user, blockedUserId: req.params.id });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/users/me/status  - Update own status
router.patch('/me/status', async (req, res, next) => {
  try {
    const { status } = req.body;
    const allowed = ['online', 'away', 'busy', 'offline'];
    if (!allowed.includes(status)) {
      return res.status(400).json({ error: 'Invalid status value.' });
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { status, lastSeen: new Date() },
      { new: true }
    );
    res.json({ user });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
