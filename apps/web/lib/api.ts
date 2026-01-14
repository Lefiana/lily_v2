// apps/web/lib/api.ts
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
        'Content-Type': 'application/json',
    },
  withCredentials: true, // Crucial for Better-Auth cookies/sessions
});

api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            // Better Auth handles redirects
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);
api.interceptors.request.use((config) => {
  config.withCredentials = true;
  return config;
})
// Helper for file uploads
export const uploadFiles = async (taskId: string, files: File[]) => {
  const formData = new FormData();
  files.forEach((file) => formData.append('files', file));

  return api.post(`/tasks/${taskId}/attachments/bulk`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};