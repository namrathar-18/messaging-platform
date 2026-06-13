const express = require('express');
const Message = require('../models/Message');
const Membership = require('../models/Membership');
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

module.exports = router;
