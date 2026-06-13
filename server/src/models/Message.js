const mongoose = require('mongoose');

const attachmentSchema = new mongoose.Schema(
  {
    filename: { type: String, required: true },
    originalName: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true }, // bytes
    url: { type: String, required: true }, // S3 public/presigned URL
    key: { type: String, required: true }, // S3 object key
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
    system: {
      // For system messages like "User joined channel"
      type: Boolean,
      default: false,
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
