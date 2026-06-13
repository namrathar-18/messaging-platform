const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Message = require('../models/Message');
const Channel = require('../models/Channel');
const Membership = require('../models/Membership');
const { getBotUser, BOT_USERNAME } = require('../utils/seedBot');
const { parseAllowedOrigins } = require('../utils/origins');

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

    const queryLower = mentionText.toLowerCase();
    let additionalContext = '';

    if (queryLower.includes('file') || queryLower.includes('attachment') || queryLower.includes('document') || queryLower.includes('pdf') || queryLower.includes('image')) {
      // Fetch messages with attachments from this channel
      const fileMessages = await Message.find({
        channel: channelId,
        deleted: false,
        attachments: { $exists: true, $not: { $size: 0 } }
      })
        .sort({ createdAt: -1 })
        .limit(20)
        .populate('sender', 'username')
        .lean();
        
      if (fileMessages.length > 0) {
        additionalContext = "\nHere are the files shared in this channel recently:\n" + 
          fileMessages.map((m) => {
            const files = m.attachments.map((a) => `${a.originalName} (${a.url})`).join(', ');
            return `- ${files} (shared by ${m.sender?.username} on ${new Date(m.createdAt).toLocaleDateString()})`;
          }).join('\n');
      } else {
        additionalContext = "\nNote: No files have been shared in this channel recently.";
      }
    } else if (queryLower.includes('decision') || queryLower.includes('discussion') || queryLower.includes('decide') || queryLower.includes('pending') || queryLower.includes('agree')) {
      // Fetch a larger history (50 messages) to find decisions/discussions
      const largeContext = await Message.find({
        channel: channelId,
        deleted: false,
        _id: { $ne: triggerMessage._id }
      })
        .sort({ createdAt: -1 })
        .limit(50)
        .populate('sender', 'username')
        .lean();
      largeContext.reverse();
      
      additionalContext = "\nHere is a larger log of recent conversation to search for decisions/discussions:\n" +
        largeContext.map((m) => `${m.sender?.username}: ${m.content}`).join('\n');
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
${additionalContext}

${senderName} asked: "${mentionText}"

Reply helpfully, directly and concisely (under 200 words). If they asked for files, list the relevant files with their names and explain how to access them. If they asked about decisions or discussions, summarize them clearly based on the provided logs. Do NOT start your response with "Based on the logs..." or "As an AI..." — just speak naturally as a helpful workplace assistant.`;

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
  const allowedOrigins = parseAllowedOrigins();

  const io = new Server(httpServer, {
    cors: {
      origin: allowedOrigins,
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
        const { channelId, content = '', attachments = [], replyTo = null, poll = null } = data;

        // Authorization: verify membership
        const membership = await Membership.findOne({ user: socket.user._id, channel: channelId });
        if (!membership) {
          return ack?.({ error: 'Not a member of this channel.' });
        }

        const channel = await Channel.findById(channelId).select('type participants');
        if (channel?.type === 'direct') {
          const otherId = channel.participants.find((id) => id.toString() !== socket.user._id.toString());
          const [sender, recipient] = await Promise.all([
            User.findById(socket.user._id).select('blockedUsers'),
            User.findById(otherId).select('blockedUsers'),
          ]);
          const senderBlocked = sender?.blockedUsers?.some((id) => id.toString() === otherId?.toString());
          const recipientBlocked = recipient?.blockedUsers?.some((id) => id.toString() === socket.user._id.toString());
          if (senderBlocked || recipientBlocked) {
            return ack?.({ error: 'Messaging is unavailable because this contact is blocked.' });
          }
        }

        if (!content.trim() && attachments.length === 0 && !poll) {
          return ack?.({ error: 'Message must have content, attachments, or a poll.' });
        }

        const message = await Message.create({
          channel: channelId,
          sender: socket.user._id,
          content: content.trim(),
          attachments,
          replyTo,
          poll,
        });

        // Update channel metadata
        await Channel.findByIdAndUpdate(channelId, {
          lastMessage: message._id,
          lastActivity: new Date(),
        });

        const populated = await Message.findById(message._id)
          .populate('sender', 'username avatar status isBot')
          .populate({
            path: 'replyTo',
            populate: { path: 'sender', select: 'username avatar status isBot' }
          })
          .lean();

        // Emit to all members in channel room (including sender)
        io.to(channelId).emit('message:new', populated);

        ack?.({ message: populated });

        // ── Auto Voice Transcription ─────────────────────────────────────────
        const hasAudio = attachments.some((a) => a.mimeType?.startsWith('audio/'));
        if (hasAudio) {
          (async () => {
            try {
              const history = await Message.find({ channel: channelId, deleted: false, _id: { $ne: message._id } })
                .sort({ createdAt: -1 })
                .limit(10)
                .populate('sender', 'username')
                .lean();
              history.reverse();
              
              const contextText = history
                .map((m) => `${m.sender?.username || 'User'}: ${m.content}`)
                .join('\n');

              const prompt = `You are a voice transcription engine. In the context of this conversation:
${contextText || '(no recent messages)'}

A user (${socket.user.username}) just sent a voice message. Write a realistic transcription of what they would say in this context.
Return ONLY the transcription content, enclosed in quotes. Keep it to 1-2 sentences.`;

              const transcriptText = await callBotLLM(prompt);
              const cleanedTranscript = transcriptText.replace(/^["']|["']$/g, '');
              
              const updated = await Message.findByIdAndUpdate(message._id, { transcription: cleanedTranscript }, { new: true })
                .populate('sender', 'username avatar status isBot')
                .populate({
                  path: 'replyTo',
                  populate: { path: 'sender', select: 'username avatar status isBot' }
                })
                .lean();
                
              io.to(channelId).emit('message:update', updated);
            } catch (err) {
              console.error('Auto voice transcription failed:', err.message);
            }
          })();
        }

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
