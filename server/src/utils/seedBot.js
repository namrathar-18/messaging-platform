/**
 * seedBot.js
 * Ensures the @ai-assistant bot user exists in the database.
 * Call once after MongoDB connects.
 */
const User = require('../models/User');

const BOT_USERNAME = 'ai-assistant';
const BOT_EMAIL = 'ai-assistant@bot.internal';
const BOT_PASSWORD = process.env.BOT_PASSWORD || 'B0t$ecure!Internal#2024';

let botUser = null;

async function seedBot() {
  try {
    let bot = await User.findOne({ username: BOT_USERNAME });
    if (!bot) {
      // Create without triggering bcrypt on bot password (it'll be hashed by pre-save hook)
      bot = await User.create({
        username: BOT_USERNAME,
        email: BOT_EMAIL,
        password: BOT_PASSWORD,
        isBot: true,
        status: 'online',
      });
      console.log('[Bot] @ai-assistant bot user created.');
    } else if (!bot.isBot) {
      await User.findByIdAndUpdate(bot._id, { isBot: true, status: 'online' });
      console.log('[Bot] @ai-assistant bot user flagged as bot.');
    } else {
      // Keep bot always online
      await User.findByIdAndUpdate(bot._id, { status: 'online' });
      console.log('[Bot] @ai-assistant bot user ready.');
    }
    botUser = bot;
    return bot;
  } catch (err) {
    console.error('[Bot] Failed to seed bot user:', err.message);
    return null;
  }
}

function getBotUser() {
  return botUser;
}

module.exports = { seedBot, getBotUser, BOT_USERNAME };
