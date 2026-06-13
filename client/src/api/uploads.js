import api from './axios';

// Server-side upload (multipart/form-data)
export const uploadFileDirect = (file, onProgress) => {
  const formData = new FormData();
  formData.append('file', file);
  return api.post('/uploads/direct', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (e) => {
      if (onProgress && e.total) {
        onProgress(Math.round((e.loaded * 100) / e.total));
      }
    },
  });
};

// Get presigned URL then upload directly to S3 from browser
export const uploadFilePresigned = async (file, onProgress) => {
  // 1. Get presigned PUT URL from server
  const { data } = await api.post('/uploads/presign', {
    filename: file.name,
    mimeType: file.type,
    size: file.size,
  });

  const { presignedUrl, publicUrl, key } = data;

  // 2. PUT directly to S3
  await fetch(presignedUrl, {
    method: 'PUT',
    headers: { 'Content-Type': file.type },
    body: file,
  });

  return {
    data: {
      attachment: {
        filename: key.split('/').pop(),
        originalName: file.name,
        mimeType: file.type,
        size: file.size,
        url: publicUrl,
        key,
      },
    },
  };
};
