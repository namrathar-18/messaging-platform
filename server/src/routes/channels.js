const express = require('express');
const { body, validationResult } = require('express-validator');
const Channel = require('../models/Channel');
const Membership = require('../models/Membership');
const Message = require('../models/Message');
const User = require('../models/User');
const { authenticate } = require('../middleware/auth');
const { requireChannelMembership, requireRole } = require('../middleware/rbac');

const router = express.Router();
router.use(authenticate);

// GET /api/channels  - List channels the authenticated user belongs to
router.get('/', async (req, res, next) => {
  try {
    const memberships = await Membership.find({ user: req.user._id })
      .populate({
        path: 'channel',
        populate: [
          { path: 'owner', select: 'username avatar status' },
          { path: 'lastMessage' },
          { path: 'participants', select: 'username avatar status' },
        ],
      })
      .sort({ 'channel.lastActivity': -1 });

    const channels = memberships.map((m) => ({
      ...m.channel.toObject(),
      role: m.role,
      lastReadMessage: m.lastReadMessage,
    }));

    res.json({ channels });
  } catch (err) {
    next(err);
  }
});

// POST /api/channels  - Create a new group channel
router.post(
  '/',
  [
    body('name').trim().isLength({ min: 1, max: 80 }).withMessage('Channel name is required (max 80 chars)'),
    body('description').optional().trim().isLength({ max: 500 }),
    body('memberIds').optional().isArray(),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { name, description = '', memberIds = [] } = req.body;

      const channel = await Channel.create({
        name,
        description,
        type: 'group',
        owner: req.user._id,
        lastActivity: new Date(),
      });

      // Add creator as owner
      await Membership.create({ user: req.user._id, channel: channel._id, role: 'owner' });

      // Add initial members (as 'member' role)
      const uniqueMembers = [...new Set(memberIds)].filter(
        (id) => id.toString() !== req.user._id.toString()
      );
      if (uniqueMembers.length > 0) {
        const memberDocs = uniqueMembers.map((userId) => ({
          user: userId,
          channel: channel._id,
          role: 'member',
        }));
        await Membership.insertMany(memberDocs, { ordered: false });
      }

      const populated = await Channel.findById(channel._id).populate('owner', 'username avatar status');
      res.status(201).json({ channel: { ...populated.toObject(), role: 'owner' } });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/channels/direct  - Create or retrieve a DM channel
router.post('/direct', async (req, res, next) => {
  try {
    const { targetUserId } = req.body;
    if (!targetUserId) {
      return res.status(400).json({ error: 'targetUserId is required.' });
    }

    const [me, target] = await Promise.all([
      User.findById(req.user._id).select('blockedUsers'),
      User.findById(targetUserId).select('blockedUsers'),
    ]);
    if (!target) return res.status(404).json({ error: 'User not found.' });
    if (me.blockedUsers?.some((id) => id.toString() === targetUserId.toString())) {
      return res.status(403).json({ error: 'Unblock this contact before starting a chat.' });
    }
    if (target.blockedUsers?.some((id) => id.toString() === req.user._id.toString())) {
      return res.status(403).json({ error: 'You cannot message this contact.' });
    }

    // Check if DM already exists between these two users
    const existing = await Channel.findOne({
      type: 'direct',
      participants: { $all: [req.user._id, targetUserId], $size: 2 },
    }).populate('participants', 'username avatar status');

    if (existing) {
      const membership = await Membership.findOne({ user: req.user._id, channel: existing._id });
      return res.json({ channel: { ...existing.toObject(), role: membership?.role || 'member' } });
    }

    // Create new DM channel
    const channel = await Channel.create({
      name: 'direct',
      type: 'direct',
      owner: req.user._id,
      participants: [req.user._id, targetUserId],
      lastActivity: new Date(),
    });

    await Membership.insertMany([
      { user: req.user._id, channel: channel._id, role: 'member' },
      { user: targetUserId, channel: channel._id, role: 'member' },
    ]);

    const populated = await Channel.findById(channel._id).populate('participants', 'username avatar status');
    res.status(201).json({ channel: { ...populated.toObject(), role: 'member' } });
  } catch (err) {
    next(err);
  }
});

// GET /api/channels/:id  - Get channel details
router.get('/:id', requireChannelMembership, async (req, res, next) => {
  try {
    const channel = await Channel.findById(req.params.id)
      .populate('owner', 'username avatar status')
      .populate('participants', 'username avatar status');
    if (!channel) return res.status(404).json({ error: 'Channel not found.' });
    res.json({ channel: { ...channel.toObject(), role: req.membership.role } });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/channels/:id  - Update channel (admin+)
router.patch(
  '/:id',
  requireRole('admin'),
  [
    body('name').optional().trim().isLength({ min: 1, max: 80 }),
    body('description').optional().trim().isLength({ max: 500 }),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

      const updates = {};
      if (req.body.name !== undefined) updates.name = req.body.name;
      if (req.body.description !== undefined) updates.description = req.body.description;

      const channel = await Channel.findByIdAndUpdate(req.params.id, updates, { new: true })
        .populate('owner', 'username avatar status');
      res.json({ channel });
    } catch (err) {
      next(err);
    }
  }
);

// DELETE /api/channels/:id  - Delete channel (owner only)
router.delete('/:id', requireRole('owner'), async (req, res, next) => {
  try {
    await Promise.all([
      Channel.findByIdAndDelete(req.params.id),
      Membership.deleteMany({ channel: req.params.id }),
      Message.deleteMany({ channel: req.params.id }),
    ]);
    res.json({ message: 'Channel deleted successfully.' });
  } catch (err) {
    next(err);
  }
});

// GET /api/channels/:channelId/members  - List members
router.get('/:channelId/members', requireChannelMembership, async (req, res, next) => {
  try {
    const members = await Membership.find({ channel: req.params.channelId })
      .populate('user', 'username avatar status lastSeen')
      .sort({ role: 1, joinedAt: 1 });
    res.json({ members });
  } catch (err) {
    next(err);
  }
});

// POST /api/channels/:channelId/members  - Invite member (admin+)
router.post('/:channelId/members', requireRole('admin'), async (req, res, next) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId is required.' });

    const existing = await Membership.findOne({ user: userId, channel: req.params.channelId });
    if (existing) return res.status(409).json({ error: 'User is already a member.' });

    const membership = await Membership.create({
      user: userId,
      channel: req.params.channelId,
      role: 'member',
    });
    const populated = await membership.populate('user', 'username avatar status');
    res.status(201).json({ membership: populated });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/channels/:channelId/members/:userId/role  - Change role (owner only)
router.patch('/:channelId/members/:userId/role', requireRole('owner'), async (req, res, next) => {
  try {
    const { role } = req.body;
    if (!['admin', 'member'].includes(role)) {
      return res.status(400).json({ error: 'Role must be admin or member.' });
    }

    const membership = await Membership.findOneAndUpdate(
      { user: req.params.userId, channel: req.params.channelId, role: { $ne: 'owner' } },
      { role },
      { new: true }
    ).populate('user', 'username avatar status');

    if (!membership) return res.status(404).json({ error: 'Member not found or cannot modify owner.' });
    res.json({ membership });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/channels/:channelId/members/:userId  - Remove member (admin+)
router.delete('/:channelId/members/:userId', requireRole('admin'), async (req, res, next) => {
  try {
    const target = await Membership.findOne({ user: req.params.userId, channel: req.params.channelId });
    if (!target) return res.status(404).json({ error: 'Member not found.' });

    // Admins cannot remove owners
    if (target.role === 'owner') {
      return res.status(403).json({ error: 'Cannot remove the channel owner.' });
    }

    // Admins cannot remove other admins (only owners can)
    if (target.role === 'admin' && req.membership.role !== 'owner') {
      return res.status(403).json({ error: 'Only the owner can remove admins.' });
    }

    await target.deleteOne();
    res.json({ message: 'Member removed.' });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/channels/:channelId/members/leave  - Leave channel
router.delete('/:channelId/leave', requireChannelMembership, async (req, res, next) => {
  try {
    if (req.membership.role === 'owner') {
      const memberCount = await Membership.countDocuments({ channel: req.params.channelId });
      if (memberCount > 1) {
        return res.status(400).json({
          error: 'Transfer ownership before leaving, or delete the channel if you are the last member.',
        });
      }
      // Last owner — delete channel
      await Promise.all([
        Channel.findByIdAndDelete(req.params.channelId),
        Membership.deleteMany({ channel: req.params.channelId }),
        Message.deleteMany({ channel: req.params.channelId }),
      ]);
      return res.json({ message: 'Channel deleted as you were the last member.' });
    }

    await req.membership.deleteOne();
    res.json({ message: 'Left channel successfully.' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
