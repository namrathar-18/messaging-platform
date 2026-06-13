const express = require('express');
const { query, validationResult } = require('express-validator');
const User = require('../models/User');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// All user routes require authentication
router.use(authenticate);

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
