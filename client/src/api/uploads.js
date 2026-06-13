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
