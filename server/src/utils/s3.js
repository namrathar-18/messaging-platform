const { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME;
const PRESIGNED_URL_EXPIRY = parseInt(process.env.S3_PRESIGNED_URL_EXPIRY || '3600', 10);

/**
 * Upload a file buffer directly to S3
 */
const uploadToS3 = async (fileBuffer, originalName, mimeType, folder = 'attachments') => {
  const ext = path.extname(originalName);
  const key = `${folder}/${uuidv4()}${ext}`;

  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: fileBuffer,
    ContentType: mimeType,
    ContentDisposition: `inline; filename="${encodeURIComponent(originalName)}"`,
  });

  await s3Client.send(command);

  // Return the permanent S3 URL
  const url = `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
  return { key, url };
};

/**
 * Generate a presigned PUT URL for client-side direct upload
 */
const generatePresignedPutUrl = async (originalName, mimeType, folder = 'attachments') => {
  const ext = path.extname(originalName);
  const key = `${folder}/${uuidv4()}${ext}`;

  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    ContentType: mimeType,
  });

  const presignedUrl = await getSignedUrl(s3Client, command, {
    expiresIn: PRESIGNED_URL_EXPIRY,
  });

  const publicUrl = `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;

  return { key, presignedUrl, publicUrl };
};

/**
 * Generate a presigned GET URL for private objects
 */
const generatePresignedGetUrl = async (key) => {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  return getSignedUrl(s3Client, command, { expiresIn: PRESIGNED_URL_EXPIRY });
};

/**
 * Delete a file from S3
 */
const deleteFromS3 = async (key) => {
  const command = new DeleteObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });
  await s3Client.send(command);
};

module.exports = { uploadToS3, generatePresignedPutUrl, generatePresignedGetUrl, deleteFromS3 };
