const mongoose = require('mongoose');

const membershipSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    channel: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Channel',
      required: true,
    },
    role: {
      type: String,
      enum: ['owner', 'admin', 'member'],
      default: 'member',
    },
    // Track unread count
    lastReadMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
      default: null,
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
    notificationsEnabled: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Unique constraint: one membership per user per channel
membershipSchema.index({ user: 1, channel: 1 }, { unique: true });
membershipSchema.index({ channel: 1, role: 1 });
membershipSchema.index({ user: 1, joinedAt: -1 });

module.exports = mongoose.model('Membership', membershipSchema);
