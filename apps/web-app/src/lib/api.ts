import axios from 'axios';
import { auth } from './auth';

export const api = axios.create({
  baseURL: 'http://localhost:4001',
});

api.interceptors.request.use((config) => {
  const token = auth.getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
