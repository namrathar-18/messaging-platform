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
      replyTo: null, // Only return top-level messages in main feed
      // Hide "delete for me" messages for this user
      $or: [
        { deletedFor: { $exists: false } },
        { deletedFor: { $size: 0 } },
        { deletedFor: { $not: { $elemMatch: { user: req.user._id } } } },
      ],
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

// POST /api/messages/:channelId/:messageId/reply
// Body: { content, attachments }
router.post('/:channelId/:messageId/reply', requireChannelMembership, async (req, res, next) => {
  try {
    const { content = '', attachments = [] } = req.body;

    if (!content.trim() && attachments.length === 0) {
      return res.status(400).json({ error: 'Reply must have content or attachments.' });
    }

    const message = await Message.create({
      channel: req.params.channelId,
      sender: req.user._id,
      content: content.trim(),
      attachments,
      replyTo: req.params.messageId,
    });

    await Channel.findByIdAndUpdate(req.params.channelId, {
      lastMessage: message._id,
      lastActivity: new Date(),
    });

    const populated = await Message.findById(message._id)
      .populate('sender', 'username avatar status isBot')
      .populate({
        path: 'replyTo',
        populate: { path: 'sender', select: 'username avatar status isBot' },
      })
      .lean();

    res.status(201).json({ message: populated });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/messages/:channelId/:messageId/edit
// Body: { content }
router.patch('/:channelId/:messageId/edit', requireChannelMembership, async (req, res, next) => {
  try {
    const { content = '' } = req.body;

    if (!content.trim()) {
      return res.status(400).json({ error: 'Edited content cannot be empty.' });
    }

    const message = await Message.findOneAndUpdate(
      {
        _id: req.params.messageId,
        channel: req.params.channelId,
        sender: req.user._id,
      },
      {
        content: content.trim(),
        editedAt: new Date(),
      },
      { new: true }
    )
      .populate('sender', 'username avatar status isBot')
      .populate({
        path: 'replyTo',
        populate: { path: 'sender', select: 'username avatar status isBot' },
      });

    if (!message) return res.status(404).json({ error: 'Message not found.' });

    res.json({ message });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/messages/:channelId/:messageId/delete-for-me
router.delete('/:channelId/:messageId/delete-for-me', requireChannelMembership, async (req, res, next) => {
  try {
    await Message.updateOne(
      {
        _id: req.params.messageId,
        channel: req.params.channelId,
      },
      {
        $addToSet: { deletedFor: { user: req.user._id, deletedAt: new Date() } },
      }
    );

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// ── GET /api/messages/:channelId/threads/:messageId ───────────────────────
// Fetch parent message and replies for a threaded discussion
router.get('/:channelId/threads/:messageId', requireChannelMembership, async (req, res, next) => {
  try {
    const parent = await Message.findOne({ _id: req.params.messageId, channel: req.params.channelId })
      .populate('sender', 'username avatar status');
    
    if (!parent) return res.status(404).json({ error: 'Parent message not found.' });

    const replies = await Message.find({
      channel: req.params.channelId,
      replyTo: req.params.messageId,
      deleted: false
    })
      .sort({ createdAt: 1 })
      .populate('sender', 'username avatar status');

    res.json({ parent, replies });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/messages/:channelId/:messageId/vote ─────────────────────────
// Vote on a poll option (single choice, togglable)
router.post('/:channelId/:messageId/vote', requireChannelMembership, async (req, res, next) => {
  try {
    const { optionIndex } = req.body;
    const userId = req.user._id;

    if (optionIndex === undefined || typeof optionIndex !== 'number') {
      return res.status(400).json({ error: 'optionIndex (number) is required.' });
    }

    const message = await Message.findOne({ _id: req.params.messageId, channel: req.params.channelId });
    if (!message || !message.poll) return res.status(404).json({ error: 'Poll not found.' });
    if (message.poll.closed) return res.status(400).json({ error: 'Poll is closed.' });

    if (optionIndex < 0 || optionIndex >= message.poll.options.length) {
      return res.status(400).json({ error: 'Invalid option index.' });
    }

    // Single-choice vote toggle:
    message.poll.options.forEach((opt, idx) => {
      const voteIdx = opt.votes.findIndex((vId) => vId.toString() === userId.toString());
      if (idx === optionIndex) {
        if (voteIdx !== -1) {
          // Already voted for this → toggle off
          opt.votes.splice(voteIdx, 1);
        } else {
          // Vote on this
          opt.votes.push(userId);
        }
      } else {
        // Clear votes from other options
        if (voteIdx !== -1) {
          opt.votes.splice(voteIdx, 1);
        }
      }
    });

    await message.save();

    const populated = await Message.findById(message._id)
      .populate('sender', 'username avatar status')
      .populate({
        path: 'replyTo',
        populate: { path: 'sender', select: 'username avatar status' }
      });

    // Broadcast updated message via socket.io if initialized
    const io = req.app.get('io');
    if (io) {
      io.to(req.params.channelId).emit('message:update', populated);
    }

    res.json({ message: populated });
  } catch (err) {
    next(err);
  }
});

const LLM_ENDPOINT =
  'https://app-cb69r5stolj5-api-VaOwP8E7dJqa.gateway.appmedo.com/v1beta/models/gemini-2.5-flash:streamGenerateContent?alt=sse';

async function callLLM(contents) {
  const apiKey = process.env.INTEGRATIONS_API_KEY;
  if (!apiKey) throw new Error('INTEGRATIONS_API_KEY is not set.');

  const response = await fetch(LLM_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Gateway-Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ contents }),
    signal: AbortSignal.timeout(90_000),
  });

  if (!response.ok) throw new Error(`LLM error: ${response.status}`);
  if (!response.body) throw new Error('No response body.');

  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';
  let fullText = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    for (const line of lines) {
      if (!line.startsWith('data:')) continue;
      const dataStr = line.slice(5).trim();
      if (!dataStr || dataStr === '[DONE]') continue;
      try {
        const frame = JSON.parse(dataStr);
        const text = frame?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) fullText += text;
      } catch { /* incomplete frame */ }
    }
  }
  return fullText.trim();
}

// ── POST /api/messages/:channelId/:messageId/close-poll ───────────────────
// Close a poll and generate an AI decision summary
router.post('/:channelId/:messageId/close-poll', requireChannelMembership, async (req, res, next) => {
  try {
    const message = await Message.findOne({ _id: req.params.messageId, channel: req.params.channelId });
    if (!message || !message.poll) return res.status(404).json({ error: 'Poll not found.' });

    message.poll.closed = true;

    // Compile results
    const totalVotes = message.poll.options.reduce((sum, opt) => sum + opt.votes.length, 0);
    
    if (totalVotes === 0) {
      message.poll.decisionSummary = 'Decision: No votes were cast. Poll closed.';
    } else {
      const resultsText = message.poll.options
        .map((opt) => `"${opt.text}": ${opt.votes.length} votes`)
        .join(', ');

      const prompt = `You are a decision summarizer. A team poll has been completed.
Poll Question: "${message.poll.question}"
Results: ${resultsText} (Total votes: ${totalVotes}).

Write a 1-sentence decision summary stating the final outcome, decision, or percentage approval. E.g., "Decision: Deployment approved by 82% members." or "Decision: Option A won with 4 votes."
Be very concise and return ONLY the decision sentence.`;

      try {
        const summary = await callLLM([{ role: 'user', parts: [{ text: prompt }] }]);
        message.poll.decisionSummary = summary || 'Decision closed.';
      } catch (err) {
        message.poll.decisionSummary = 'Decision closed and finalized.';
      }
    }

    await message.save();

    const populated = await Message.findById(message._id)
      .populate('sender', 'username avatar status')
      .populate({
        path: 'replyTo',
        populate: { path: 'sender', select: 'username avatar status' }
      });

    const io = req.app.get('io');
    if (io) {
      io.to(req.params.channelId).emit('message:update', populated);
    }

    res.json({ message: populated });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
