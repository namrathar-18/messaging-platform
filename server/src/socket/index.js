const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Message = require('../models/Message');
const Channel = require('../models/Channel');
const Membership = require('../models/Membership');
const { getBotUser, BOT_USERNAME } = require('../utils/seedBot');

// Map: userId -> Set of socketIds (a user can have multiple tabs)
const onlineUsers = new Map();

// ── Bot LLM helper ─────────────────────────────────────────────────────────
const LLM_ENDPOINT =
  'https://app-cb69r5stolj5-api-VaOwP8E7dJqa.gateway.appmedo.com/v1beta/models/gemini-2.5-flash:streamGenerateContent?alt=sse';

async function callBotLLM(prompt) {
  const apiKey = process.env.INTEGRATIONS_API_KEY;
  if (!apiKey) throw new Error('INTEGRATIONS_API_KEY not set.');

  const response = await fetch(LLM_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Gateway-Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: prompt }] }] }),
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

/**
 * Handle @ai-assistant mention: fetch context, call LLM, post bot reply.
 */
async function handleBotMention(io, channelId, triggerMessage, mentionText) {
  const bot = getBotUser();
  if (!bot) return;

  try {
    // Ensure bot is a member of this channel
    const botMembership = await Membership.findOne({ user: bot._id, channel: channelId });
    if (!botMembership) {
      await Membership.create({ user: bot._id, channel: channelId, role: 'member' });
    }

    // Fetch last 10 messages as context (excluding the trigger)
    const context = await Message.find({
      channel: channelId,
      deleted: false,
      _id: { $ne: triggerMessage._id },
    })
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('sender', 'username')
      .lean();
    context.reverse();

    const contextText = context
      .map((m) => `${m.sender?.username || 'User'}: ${m.content}`)
      .join('\n');

    const senderName = triggerMessage.sender?.username || 'User';

    const prompt = `You are @ai-assistant, a helpful AI bot inside a team messaging platform.

Recent conversation context:
${contextText || '(no prior messages)'}

${senderName} asked: "${mentionText}"

Reply helpfully and concisely (under 200 words). If it's a coding question, include a brief code snippet. If it's a general question, give a direct answer. Do NOT repeat "As an AI..." preambles — just answer naturally.`;

    const replyContent = await callBotLLM(prompt);

    // Post bot reply as a message from the bot account
    const botMessage = await Message.create({
      channel: channelId,
      sender: bot._id,
      content: replyContent || "I'm sorry, I couldn't generate a response. Please try again.",
      attachments: [],
    });

    await Channel.findByIdAndUpdate(channelId, {
      lastMessage: botMessage._id,
      lastActivity: new Date(),
    });

    const populated = await Message.findById(botMessage._id)
      .populate('sender', 'username avatar status isBot')
      .lean();

    // Emit to all channel members
    io.to(channelId).emit('message:new', populated);
  } catch (err) {
    console.error('[Bot] Failed to respond to mention:', err.message);

    // Post a graceful error message
    try {
      const bot = getBotUser();
      if (!bot) return;
      const errMsg = await Message.create({
        channel: channelId,
        sender: bot._id,
        content: '⚠️ I encountered an issue generating a response. Please try again in a moment.',
        attachments: [],
      });
      const populated = await Message.findById(errMsg._id)
        .populate('sender', 'username avatar status isBot')
        .lean();
      io.to(channelId).emit('message:new', populated);
    } catch { /* silent */ }
  }
}

const initSocket = (httpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:5173',
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // ── JWT Authentication middleware ─────────────────────────────────────────
  io.use(async (socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) return next(new Error('Authentication token required.'));

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('-password');
      if (!user) return next(new Error('User not found.'));

      socket.user = user;
      next();
    } catch (err) {
      next(new Error('Invalid or expired token.'));
    }
  });

  // ── Connection handler ────────────────────────────────────────────────────
  io.on('connection', async (socket) => {
    const userId = socket.user._id.toString();
    console.log(`Socket connected: ${socket.id} (user: ${socket.user.username})`);

    // Track online socket
    if (!onlineUsers.has(userId)) {
      onlineUsers.set(userId, new Set());
    }
    onlineUsers.get(userId).add(socket.id);

    // Join all channels the user belongs to
    const memberships = await Membership.find({ user: socket.user._id }).select('channel');
    const channelIds = memberships.map((m) => m.channel.toString());
    channelIds.forEach((cId) => socket.join(cId));

    // Update user status to online
    await User.findByIdAndUpdate(userId, { status: 'online', lastSeen: new Date() });

    // Broadcast presence update to all channels
    channelIds.forEach((cId) => {
      socket.to(cId).emit('presence:update', { userId, status: 'online' });
    });

    // Send current online users list to connected user
    socket.emit('presence:online_users', [...onlineUsers.keys()]);

    // ── send:message ─────────────────────────────────────────────────────────
    socket.on('send:message', async (data, ack) => {
      try {
        const { channelId, content = '', attachments = [] } = data;

        // Authorization: verify membership
        const membership = await Membership.findOne({ user: socket.user._id, channel: channelId });
        if (!membership) {
          return ack?.({ error: 'Not a member of this channel.' });
        }

        if (!content.trim() && attachments.length === 0) {
          return ack?.({ error: 'Message must have content or attachments.' });
        }

        const message = await Message.create({
          channel: channelId,
          sender: socket.user._id,
          content: content.trim(),
          attachments,
        });

        // Update channel metadata
        await Channel.findByIdAndUpdate(channelId, {
          lastMessage: message._id,
          lastActivity: new Date(),
        });

        const populated = await Message.findById(message._id)
          .populate('sender', 'username avatar status isBot')
          .lean();

        // Emit to all members in channel room (including sender)
        io.to(channelId).emit('message:new', populated);

        ack?.({ message: populated });

        // ── Bot mention detection ───────────────────────────────────────────
        const mentionPattern = /@ai-assistant\b/i;
        if (mentionPattern.test(content)) {
          // Strip the @mention prefix to get the actual query
          const mentionText = content
            .replace(/@ai-assistant\s*/i, '')
            .trim() || 'Hello! How can you help?';
          // Run async — don't block the ack
          handleBotMention(io, channelId, populated, mentionText);
        }
      } catch (err) {
        console.error('send:message error:', err.message);
        ack?.({ error: 'Failed to send message.' });
      }
    });

    // ── typing:start ─────────────────────────────────────────────────────────
    socket.on('typing:start', async ({ channelId }) => {
      const membership = await Membership.exists({ user: socket.user._id, channel: channelId });
      if (!membership) return;

      socket.to(channelId).emit('typing:update', {
        channelId,
        userId,
        username: socket.user.username,
        isTyping: true,
      });
    });

    // ── typing:stop ──────────────────────────────────────────────────────────
    socket.on('typing:stop', ({ channelId }) => {
      socket.to(channelId).emit('typing:update', {
        channelId,
        userId,
        username: socket.user.username,
        isTyping: false,
      });
    });

    // ── message:read ─────────────────────────────────────────────────────────
    socket.on('message:read', async ({ channelId, messageId }) => {
      try {
        const membership = await Membership.findOne({ user: socket.user._id, channel: channelId });
        if (!membership) return;

        await Message.findOneAndUpdate(
          {
            _id: messageId,
            channel: channelId,
            'readBy.user': { $ne: socket.user._id },
          },
          { $push: { readBy: { user: socket.user._id, readAt: new Date() } } }
        );

        await Membership.findOneAndUpdate(
          { user: socket.user._id, channel: channelId },
          { lastReadMessage: messageId }
        );

        // Notify channel members about read receipt
        socket.to(channelId).emit('message:read_receipt', {
          channelId,
          messageId,
          userId,
          readAt: new Date().toISOString(),
        });
      } catch (err) {
        console.error('message:read error:', err.message);
      }
    });

    // ── channel:join (dynamic room join when user is added to a channel) ───────
    socket.on('channel:join', ({ channelId }) => {
      socket.join(channelId);
    });

    // ── channel:leave ──────────────────────────────────────────────────────────
    socket.on('channel:leave', ({ channelId }) => {
      socket.leave(channelId);
    });

    // ── disconnect ────────────────────────────────────────────────────────────
    socket.on('disconnect', async () => {
      console.log(`Socket disconnected: ${socket.id}`);
      const sockets = onlineUsers.get(userId);
      if (sockets) {
        sockets.delete(socket.id);
        if (sockets.size === 0) {
          // No more sockets for this user → go offline
          onlineUsers.delete(userId);
          await User.findByIdAndUpdate(userId, { status: 'offline', lastSeen: new Date() });
          // Broadcast offline status
          channelIds.forEach((cId) => {
            io.to(cId).emit('presence:update', { userId, status: 'offline' });
          });
        }
      }
    });
  });

  return io;
};

module.exports = initSocket;
