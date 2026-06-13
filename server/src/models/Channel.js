const mongoose = require('mongoose');

const channelSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Channel name is required'],
      trim: true,
      maxlength: [80, 'Channel name cannot exceed 80 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
      default: '',
    },
    type: {
      type: String,
      enum: ['group', 'direct'],
      required: true,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // For DMs: store both participant IDs for lookup
    participants: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    }],
    lastMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
      default: null,
    },
    lastActivity: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for DM lookup (unique pair)
channelSchema.index({ type: 1, participants: 1 });
channelSchema.index({ owner: 1 });
channelSchema.index({ lastActivity: -1 });

module.exports = mongoose.model('Channel', channelSchema);
