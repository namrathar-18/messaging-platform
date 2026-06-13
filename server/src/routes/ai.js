const express = require('express');
const Message = require('../models/Message');
const Membership = require('../models/Membership');
const Channel = require('../models/Channel');
const User = require('../models/User');
const { authenticate } = require('../middleware/auth');
const { requireChannelMembership } = require('../middleware/rbac');

const router = express.Router();
router.use(authenticate);

const LLM_ENDPOINT =
  'https://app-cb69r5stolj5-api-VaOwP8E7dJqa.gateway.appmedo.com/v1beta/models/gemini-2.5-flash:streamGenerateContent?alt=sse';

/**
 * Calls Gemini 2.5 Flash, collects the full SSE stream, returns concatenated text.
 */
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

  if (response.status === 429) throw Object.assign(new Error('AI quota exceeded. Please try again later.'), { status: 429 });
  if (response.status === 402) throw Object.assign(new Error('Insufficient AI balance.'), { status: 402 });
  if (!response.ok) throw Object.assign(new Error(`LLM upstream error: ${response.status}`), { status: 502 });
  if (!response.body) throw new Error('No response body from LLM.');

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

// ── POST /api/ai/smart-replies ─────────────────────────────────────────────
// Body: { channelId, messageContent, senderName }
// Returns: { suggestions: string[] }
router.post('/smart-replies', async (req, res, next) => {
  try {
    const { channelId, messageContent, senderName } = req.body;
    if (!channelId || !messageContent) {
      return res.status(400).json({ error: 'channelId and messageContent are required.' });
    }

    // Verify membership
    const membership = await Membership.findOne({ user: req.user._id, channel: channelId });
    if (!membership) return res.status(403).json({ error: 'Not a member of this channel.' });

    // Fetch last 6 messages for context
    const recentMessages = await Message.find({ channel: channelId, deleted: false })
      .sort({ createdAt: -1 })
      .limit(6)
      .populate('sender', 'username')
      .lean();
    recentMessages.reverse();

    const contextText = recentMessages
      .map((m) => `${m.sender?.username || 'User'}: ${m.content}`)
      .join('\n');

    const prompt = `You are a helpful assistant generating smart reply suggestions for a team messaging app.

Conversation context:
${contextText}

The latest message from ${senderName} is: "${messageContent}"

Generate exactly 3 short, natural reply suggestions (each under 15 words) that ${req.user.username} might send in response. They should be conversational, relevant, and varied in tone.

Respond ONLY with a JSON array of 3 strings, like:
["Reply one", "Reply two", "Reply three"]`;

    const rawText = await callLLM([{ role: 'user', parts: [{ text: prompt }] }]);

    // Parse JSON array from response
    const match = rawText.match(/\[[\s\S]*?\]/);
    let suggestions = ['Sounds good!', 'Got it, thanks!', "I'll look into this."];
    if (match) {
      try {
        const parsed = JSON.parse(match[0]);
        if (Array.isArray(parsed) && parsed.length > 0) {
          suggestions = parsed.slice(0, 3).map((s) => String(s));
        }
      } catch { /* use defaults */ }
    }

    res.json({ suggestions });
  } catch (err) {
    next(err);
  }
});

// POST /api/ai/compose
// Body: { text, action }
// Returns: { text }
router.post('/compose', async (req, res, next) => {
  try {
    const { text = '', action = 'rewrite' } = req.body;
    const trimmed = text.trim();
    if (!trimmed) return res.status(400).json({ error: 'Text is required.' });

    const allowedActions = {
      rewrite: 'Rewrite this message so it is clearer, natural, and ready to send.',
      shorten: 'Shorten this message while preserving the core meaning.',
      professional: 'Rewrite this message in a polished professional tone.',
      friendly: 'Rewrite this message in a warm, friendly tone.',
    };

    const instruction = allowedActions[action] || allowedActions.rewrite;
    const prompt = `${instruction}

Message:
${trimmed}

Return only the improved message. Do not add quotes, labels, or explanations.`;

    const improved = await callLLM([{ role: 'user', parts: [{ text: prompt }] }]);
    res.json({ text: improved || trimmed });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/ai/summarize ────────────────────────────────────────────────
// Body: { channelId, limit? }
// Returns: { summary: string }
router.post('/summarize', async (req, res, next) => {
  try {
    const { channelId, limit = 50 } = req.body;
    if (!channelId) return res.status(400).json({ error: 'channelId is required.' });

    const membership = await Membership.findOne({ user: req.user._id, channel: channelId });
    if (!membership) return res.status(403).json({ error: 'Not a member of this channel.' });

    const messages = await Message.find({ channel: channelId, deleted: false })
      .sort({ createdAt: -1 })
      .limit(Math.min(limit, 100))
      .populate('sender', 'username')
      .lean();
    messages.reverse();

    if (messages.length < 3) {
      return res.status(400).json({ error: 'Not enough messages to summarize (need at least 3).' });
    }

    const conversationText = messages
      .map((m) => `[${new Date(m.createdAt).toLocaleTimeString()}] ${m.sender?.username || 'User'}: ${m.content}`)
      .join('\n');

    const prompt = `Summarize the following team chat conversation concisely (3-5 sentences). Focus on key decisions, action items, and topics discussed. Do not use bullet points — write as a short paragraph.

Conversation:
${conversationText}

Summary:`;

    const summary = await callLLM([{ role: 'user', parts: [{ text: prompt }] }]);
    res.json({ summary });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/ai/search ──────────────────────────────────────────────────
// Body: { channelId, query }
// Returns: { results: [{ messageId, content, senderName, createdAt, relevance }] }
router.post('/search', async (req, res, next) => {
  try {
    const { channelId, query } = req.body;
    if (!channelId || !query?.trim()) {
      return res.status(400).json({ error: 'channelId and query are required.' });
    }

    const membership = await Membership.findOne({ user: req.user._id, channel: channelId });
    if (!membership) return res.status(403).json({ error: 'Not a member of this channel.' });

    // Fetch last 200 messages as the search corpus
    const messages = await Message.find({
      channel: channelId,
      deleted: false,
      content: { $ne: '' },
    })
      .sort({ createdAt: -1 })
      .limit(200)
      .populate('sender', 'username')
      .lean();
    messages.reverse();

    if (messages.length === 0) {
      return res.json({ results: [] });
    }

    const corpus = messages.map((m, i) => `[${i}] ${m.sender?.username}: ${m.content}`).join('\n');

    const prompt = `You are a semantic search engine for a team chat application.

Search query: "${query}"

Messages (each prefixed with its index number):
${corpus}

Find the most relevant messages that match the search query. Consider semantic meaning, not just keywords.

Respond ONLY with a JSON array of up to 5 index numbers (integers), ordered by relevance (most relevant first), like:
[3, 7, 12, 0, 25]

If no messages are relevant, respond with: []`;

    const rawText = await callLLM([{ role: 'user', parts: [{ text: prompt }] }]);

    const match = rawText.match(/\[[\s\S]*?\]/);
    let indices = [];
    if (match) {
      try {
        const parsed = JSON.parse(match[0]);
        if (Array.isArray(parsed)) {
          indices = parsed
            .filter((i) => typeof i === 'number' && i >= 0 && i < messages.length)
            .slice(0, 5);
        }
      } catch { /* no results */ }
    }

    const results = indices.map((i) => ({
      messageId: messages[i]._id,
      content: messages[i].content,
      senderName: messages[i].sender?.username || 'Unknown',
      createdAt: messages[i].createdAt,
      attachments: messages[i].attachments || [],
    }));

    res.json({ results });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/ai/recap ──────────────────────────────────────────────────
// Body: { channelId }
// Returns: { unreadCount, recap }
router.post('/recap', async (req, res, next) => {
  try {
    const { channelId } = req.body;
    if (!channelId) return res.status(400).json({ error: 'channelId is required.' });

    const membership = await Membership.findOne({ user: req.user._id, channel: channelId }).populate('lastReadMessage');
    if (!membership) return res.status(403).json({ error: 'Not a member of this channel.' });

    // Fetch unread messages
    let query = { channel: channelId, deleted: false };
    if (membership.lastReadMessage) {
      query.createdAt = { $gt: membership.lastReadMessage.createdAt };
    }

    const unreadMessages = await Message.find(query)
      .sort({ createdAt: 1 })
      .limit(100)
      .populate('sender', 'username')
      .lean();

    const unreadCount = unreadMessages.length;

    if (unreadCount < 3) {
      return res.json({
        unreadCount,
        recap: "No significant missed messages to summarize. Just a few updates!"
      });
    }

    const conversationText = unreadMessages
      .map((m) => `${m.sender?.username || 'User'}: ${m.content}`)
      .join('\n');

    const prompt = `You are an AI assistant. The user has been away and missed ${unreadCount} messages in this team channel.
Summarize what they missed. List the key decisions, tasks completed, scheduled items, and active discussions. Format your response exactly like this (using bullet points):

Quick Recap:
• [Bullet item 1]
• [Bullet item 2]
• [Bullet item 3]
• [Bullet item 4]

Keep the list to 3-5 high-value points. Do not mention message counts or say "Here is the summary" - just return the list.

Missed Messages:
${conversationText}

Recap:`;

    const recap = await callLLM([{ role: 'user', parts: [{ text: prompt }] }]);
    res.json({ unreadCount, recap });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/ai/meeting-notes ──────────────────────────────────────────
// Body: { channelId, duration, callType }
// Returns: { summary: string }
router.post('/meeting-notes', async (req, res, next) => {
  try {
    const { channelId, duration = '5:12', callType = 'audio' } = req.body;
    if (!channelId) return res.status(400).json({ error: 'channelId is required.' });

    const channel = await Channel.findById(channelId).populate('participants', 'username');
    if (!channel) return res.status(404).json({ error: 'Channel not found.' });

    // Get some context from recent messages to make notes relevant
    const recentMessages = await Message.find({ channel: channelId, deleted: false })
      .sort({ createdAt: -1 })
      .limit(15)
      .populate('sender', 'username')
      .lean();
    recentMessages.reverse();

    const contextText = recentMessages
      .map((m) => `${m.sender?.username || 'User'}: ${m.content}`)
      .join('\n');

    const participantList = channel.participants?.map((p) => p.username).join(', ') || req.user.username;

    const prompt = `You are @ai-assistant. Generate a highly realistic, professional, context-aware Meeting Summary for a ${callType} call that lasted ${duration} minutes.
Use the channel context and recent messages to infer what key decisions and action items would realistically be discussed during this meeting.

Format your output exactly as follows (use bullet points):

Meeting Summary
Participants: ${participantList}

Key Decisions:
- [Decision 1]
- [Decision 2]

Action Items:
- [Name] → [Task assignment]
- [Name] → [Task assignment]

Keep it concise, realistic, and tailored to the chat history context below:

Chat History Context:
${contextText || '(no recent messages to derive context)'}

Summary:`;

    const summary = await callLLM([{ role: 'user', parts: [{ text: prompt }] }]);
    res.json({ summary });
  } catch (err) {
    next(err);
  }
});

// ── POST /api/ai/knowledge ──────────────────────────────────────────────
// Body: { channelId }
// Returns: { decisions: string[], documents: string[], topics: string[] }
router.post('/knowledge', async (req, res, next) => {
  try {
    const { channelId } = req.body;
    if (!channelId) return res.status(400).json({ error: 'channelId is required.' });

    const membership = await Membership.findOne({ user: req.user._id, channel: channelId });
    if (!membership) return res.status(403).json({ error: 'Not a member of this channel.' });

    const messages = await Message.find({ channel: channelId, deleted: false })
      .sort({ createdAt: -1 })
      .limit(100)
      .populate('sender', 'username')
      .lean();
    messages.reverse();

    if (messages.length === 0) {
      return res.json({
        decisions: ["No decisions recorded yet."],
        documents: ["No documents shared yet."],
        topics: ["No recent topics discussed."]
      });
    }

    const conversationText = messages
      .map((m) => `${m.sender?.username || 'User'}: ${m.content} ${m.attachments?.map((a) => `[File: ${a.originalName}]`).join(' ') || ''}`)
      .join('\n');

    const prompt = `You are an AI knowledge extractor. Scan the following conversation in a team channel.
Extract:
1. Important decisions made (deadlines, technology choices, agreements).
2. Shared documents/files (explicitly referenced or uploaded).
3. Frequently discussed topics.

Return ONLY a raw JSON object containing these lists, with no markdown formatting or backticks. Example format:
{
  "decisions": ["Decision 1 text", "Decision 2 text"],
  "documents": ["Document A", "Document B"],
  "topics": ["Topic X", "Topic Y"]
}

Conversation:
${conversationText}

JSON output:`;

    const rawResult = await callLLM([{ role: 'user', parts: [{ text: prompt }] }]);
    
    // Attempt to parse JSON
    const match = rawResult.match(/\{[\s\S]*?\}/);
    let data = {
      decisions: ["No decisions found in recent history."],
      documents: ["No shared files extracted yet."],
      topics: ["General discussion"]
    };
    if (match) {
      try {
        const parsed = JSON.parse(match[0]);
        if (parsed.decisions) data.decisions = parsed.decisions.slice(0, 5);
        if (parsed.documents) data.documents = parsed.documents.slice(0, 5);
        if (parsed.topics) data.topics = parsed.topics.slice(0, 5);
      } catch { /* use defaults */ }
    }
    res.json(data);
  } catch (err) {
    next(err);
  }
});

// ── POST /api/ai/insights ───────────────────────────────────────────────
// Body: { channelId }
// Returns: { messagesCount, activeUser, filesCount, topics: string[], responseTime: string, timeline: [{ time, user, text }] }
router.post('/insights', async (req, res, next) => {
  try {
    const { channelId } = req.body;
    if (!channelId) return res.status(400).json({ error: 'channelId is required.' });

    const membership = await Membership.findOne({ user: req.user._id, channel: channelId });
    if (!membership) return res.status(403).json({ error: 'Not a member of this channel.' });

    // Fetch messages from last 7 days or last 150 messages
    const messages = await Message.find({ channel: channelId, deleted: false })
      .sort({ createdAt: -1 })
      .limit(150)
      .populate('sender', 'username')
      .lean();

    const messagesCount = messages.length;
    let filesCount = 0;
    const senderCounts = {};

    messages.forEach((m) => {
      if (m.attachments && m.attachments.length > 0) {
        filesCount += m.attachments.length;
      }
      if (m.sender?.username) {
        senderCounts[m.sender.username] = (senderCounts[m.sender.username] || 0) + 1;
      }
    });

    let activeUser = 'None';
    let maxMsgs = 0;
    Object.entries(senderCounts).forEach(([user, count]) => {
      if (count > maxMsgs) {
        maxMsgs = count;
        activeUser = user;
      }
    });

    if (messagesCount === 0) {
      return res.json({
        messagesCount: 0,
        activeUser: 'None',
        filesCount: 0,
        topics: [],
        responseTime: 'N/A',
        timeline: []
      });
    }

    messages.reverse();
    const conversationText = messages
      .slice(-50) // look at last 50 for topics and timeline
      .map((m) => `[${new Date(m.createdAt).toLocaleTimeString()}] ${m.sender?.username || 'User'}: ${m.content}`)
      .join('\n');

    const prompt = `You are a group analytics engine. Based on the following stats:
- Total Messages Analyzed: ${messagesCount}
- Most Active User: ${activeUser}
- Files Shared: ${filesCount}

And the recent chat log:
${conversationText}

Generate:
1. A list of 3 topics discussed in the last week.
2. A response time estimate (e.g. "4 mins", "12 mins").
3. A timeline of 3-4 significant events with exact times from the logs (e.g. "Namratha uploaded Design.pdf", "Harshitha requested deploy approval").

Return ONLY a raw JSON object with no markdown wrappers or backticks. Format:
{
  "topics": ["Topic A", "Topic B", "Topic C"],
  "responseTime": "5 mins",
  "timeline": [
    { "time": "9:12 AM", "user": "Megha", "text": "uploaded Report.pdf" },
    { "time": "10:30 AM", "user": "Namratha", "text": "finalized dashboard redesign" }
  ]
}

JSON output:`;

    const rawResult = await callLLM([{ role: 'user', parts: [{ text: prompt }] }]);
    const match = rawResult.match(/\{[\s\S]*?\}/);
    let result = {
      messagesCount,
      activeUser,
      filesCount,
      topics: ["General discussion"],
      responseTime: "5 mins",
      timeline: []
    };

    if (match) {
      try {
        const parsed = JSON.parse(match[0]);
        if (parsed.topics) result.topics = parsed.topics;
        if (parsed.responseTime) result.responseTime = parsed.responseTime;
        if (parsed.timeline) result.timeline = parsed.timeline;
      } catch { /* use defaults */ }
    }

    res.json(result);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
