const mongoose = require('mongoose');

const storySchema = new mongoose.Schema(
  {
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    caption: {
      type: String,
      trim: true,
      maxlength: [300, 'Story caption cannot exceed 300 characters'],
      default: '',
    },
    media: {
      filename: String,
      originalName: String,
      mimeType: String,
      size: Number,
      url: String,
      key: String,
    },
    background: {
      type: String,
      default: 'aurora',
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 },
    },
    viewedBy: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: true,
        },
        viewedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  { timestamps: true }
);

storySchema.index({ author: 1, createdAt: -1 });

module.exports = mongoose.model('Story', storySchema);
