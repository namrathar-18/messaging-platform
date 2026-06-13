const express = require('express');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { authenticate } = require('../middleware/auth');
const { upload, handleMulterError } = require('../middleware/upload');

const router = express.Router();
router.use(authenticate);

const UPLOAD_ROOT = path.join(__dirname, '..', '..', 'uploads');
const ATTACHMENT_FOLDER = 'attachments';

const ensureUploadFolder = () => {
  const dir = path.join(UPLOAD_ROOT, ATTACHMENT_FOLDER);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
};

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
      const ext = path.extname(originalname);
      const filename = `${uuidv4()}${ext}`;
      const dir = ensureUploadFolder();
      const filePath = path.join(dir, filename);

      await fs.promises.writeFile(filePath, buffer);

      const key = `${ATTACHMENT_FOLDER}/${filename}`;
      const url = `${req.protocol}://${req.get('host')}/uploads/${key}`;

      res.status(201).json({
        attachment: {
          filename,
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

module.exports = router;
