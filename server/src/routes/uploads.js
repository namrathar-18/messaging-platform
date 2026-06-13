const express = require('express');
const { authenticate } = require('../middleware/auth');
const { upload, handleMulterError } = require('../middleware/upload');
const { uploadToS3, generatePresignedPutUrl } = require('../utils/s3');

const router = express.Router();
router.use(authenticate);

// POST /api/uploads/direct  - Upload file via server (server-side S3 put)
router.post(
  '/direct',
  upload.single('file'),
  handleMulterError,
  async (req, res, next) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file provided.' });
      }

      const { originalname, mimetype, buffer, size } = req.file;
      const { key, url } = await uploadToS3(buffer, originalname, mimetype);

      res.status(201).json({
        attachment: {
          filename: key.split('/').pop(),
          originalName: originalname,
          mimeType: mimetype,
          size,
          url,
          key,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/uploads/presign  - Get a presigned PUT URL for client-side direct upload
router.post('/presign', async (req, res, next) => {
  try {
    const { filename, mimeType, size } = req.body;

    if (!filename || !mimeType) {
      return res.status(400).json({ error: 'filename and mimeType are required.' });
    }

    const MAX_SIZE = 10 * 1024 * 1024;
    if (size && size > MAX_SIZE) {
      return res.status(400).json({ error: 'File size exceeds the 10 MB limit.' });
    }

    const { key, presignedUrl, publicUrl } = await generatePresignedPutUrl(filename, mimeType);

    res.json({
      presignedUrl,
      publicUrl,
      key,
      filename: key.split('/').pop(),
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
