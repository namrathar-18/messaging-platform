const express = require('express');
const { body, validationResult } = require('express-validator');
const Story = require('../models/Story');
const User = require('../models/User');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

const STORY_LIFETIME_MS = 24 * 60 * 60 * 1000;

router.get('/', async (req, res, next) => {
  try {
    const me = await User.findById(req.user._id).select('blockedUsers').lean();
    const blockedUsers = me?.blockedUsers || [];

    const stories = await Story.find({
      expiresAt: { $gt: new Date() },
      author: { $nin: blockedUsers },
    })
      .sort({ createdAt: -1 })
      .populate('author', 'username avatar status')
      .lean();

    res.json({ stories });
  } catch (err) {
    next(err);
  }
});

router.post(
  '/',
  [
    body('caption').optional().trim().isLength({ max: 300 }).withMessage('Caption is too long.'),
    body('media').optional({ nullable: true }).isObject(),
    body('background').optional().trim().isLength({ max: 40 }),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

      const { caption = '', media = null, background = 'aurora' } = req.body;
      if (!caption.trim() && !media?.url) {
        return res.status(400).json({ error: 'Add text, an image, video, or audio to post a story.' });
      }

      const story = await Story.create({
        author: req.user._id,
        caption: caption.trim(),
        media,
        background,
        expiresAt: new Date(Date.now() + STORY_LIFETIME_MS),
      });

      const populated = await Story.findById(story._id).populate('author', 'username avatar status').lean();
      res.status(201).json({ story: populated });
    } catch (err) {
      next(err);
    }
  }
);

router.patch('/:id/view', async (req, res, next) => {
  try {
    const story = await Story.findOneAndUpdate(
      {
        _id: req.params.id,
        expiresAt: { $gt: new Date() },
        'viewedBy.user': { $ne: req.user._id },
      },
      { $push: { viewedBy: { user: req.user._id, viewedAt: new Date() } } },
      { new: true }
    ).populate('author', 'username avatar status');

    if (!story) {
      const existing = await Story.findById(req.params.id).populate('author', 'username avatar status');
      return res.json({ story: existing });
    }

    res.json({ story });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
