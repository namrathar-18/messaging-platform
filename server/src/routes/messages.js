const express = require('express');
const Message = require('../models/Message');
const Channel = require('../models/Channel');
const Membership = require('../models/Membership');
const { authenticate } = require('../middleware/auth');
const { requireChannelMembership } = require('../middleware/rbac');

const router = express.Router({ mergeParams: true });
router.use(authenticate);

const PAGE_SIZE = 50;

// GET /api/messages/:channelId  - Paginated message history
router.get('/:channelId', requireChannelMembership, async (req, res, next) => {
  try {
    const { before } = req.query; // cursor: ISO timestamp or message _id

    const filter = {
      channel: req.params.channelId,
      deleted: false,
    };

    if (before) {
      // cursor-based pagination: get messages older than `before` (a message _id)
      filter._id = { $lt: before };
    }

    const messages = await Message.find(filter)
      .sort({ createdAt: -1 })
      .limit(PAGE_SIZE)
      .populate('sender', 'username avatar status')
      .lean();

    // Reverse so oldest-first ordering for display
    messages.reverse();

    const hasMore = messages.length === PAGE_SIZE;

    res.json({ messages, hasMore });
  } catch (err) {
    next(err);
  }
});

// POST /api/messages/:channelId  - Send a message (REST fallback; primary path is Socket.io)
router.post('/:channelId', requireChannelMembership, async (req, res, next) => {
  try {
    const { content = '', attachments = [] } = req.body;

    if (!content.trim() && attachments.length === 0) {
      return res.status(400).json({ error: 'Message must have content or attachments.' });
    }

    const message = await Message.create({
      channel: req.params.channelId,
      sender: req.user._id,
      content: content.trim(),
      attachments,
    });

    // Update channel lastActivity and lastMessage
    await Channel.findByIdAndUpdate(req.params.channelId, {
      lastMessage: message._id,
      lastActivity: new Date(),
    });

    const populated = await Message.findById(message._id).populate('sender', 'username avatar status');
    res.status(201).json({ message: populated });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/messages/:channelId/:messageId/read  - Mark message as read
router.patch('/:channelId/:messageId/read', requireChannelMembership, async (req, res, next) => {
  try {
    const message = await Message.findOneAndUpdate(
      {
        _id: req.params.messageId,
        channel: req.params.channelId,
        'readBy.user': { $ne: req.user._id },
      },
      { $push: { readBy: { user: req.user._id, readAt: new Date() } } },
      { new: true }
    ).populate('sender', 'username avatar status');

    if (!message) {
      // Already marked read or not found — return existing
      const existing = await Message.findById(req.params.messageId).populate('sender', 'username avatar status');
      return res.json({ message: existing });
    }

    // Update last-read in membership
    await Membership.findOneAndUpdate(
      { user: req.user._id, channel: req.params.channelId },
      { lastReadMessage: req.params.messageId }
    );

    res.json({ message });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
