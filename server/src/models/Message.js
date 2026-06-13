const mongoose = require('mongoose');

const attachmentSchema = new mongoose.Schema(
  {
    filename: { type: String, required: true },
    originalName: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true }, // bytes
    url: { type: String, required: true }, // Public URL for uploaded file
    key: { type: String, required: true }, // Local upload storage key
  },
  { _id: false }
);

const readReceiptSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    readAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const messageSchema = new mongoose.Schema(
  {
    channel: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Channel',
      required: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    content: {
      type: String,
      trim: true,
      maxlength: [4000, 'Message cannot exceed 4000 characters'],
      default: '',
    },
    attachments: [attachmentSchema],
    readBy: [readReceiptSchema],
    deleted: {
      type: Boolean,
      default: false,
    },

    // Replying/editing metadata
    replyTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
      default: null,
    },
    editedAt: {
      type: Date,
      default: null,
    },

    // Soft-delete for "delete for me"
    // If `deletedFor` contains a user, we hide it only from that user.
    deletedFor: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        deletedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    system: {
      // For system messages like "User joined channel"
      type: Boolean,
      default: false,
    },

    // AI voice transcription
    transcription: {
      type: String,
      default: null,
    },

    // Interactive Polls
    poll: {
      question: { type: String },
      options: [
        {
          text: { type: String, required: true },
          votes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
        }
      ],
      closed: { type: Boolean, default: false },
      decisionSummary: { type: String, default: null },
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for fast message history queries (channel + time desc)
messageSchema.index({ channel: 1, createdAt: -1 });
messageSchema.index({ sender: 1, createdAt: -1 });
messageSchema.index({ channel: 1, deleted: 1, createdAt: -1 });

module.exports = mongoose.model('Message', messageSchema);
