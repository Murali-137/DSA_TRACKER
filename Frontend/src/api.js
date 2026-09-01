import axios from 'axios';
import { supabase } from './supabase';

// Normalize API URL to always include /api
const getApiBaseUrl = () => {
  let url = (import.meta.env.VITE_API_URL || 'http://localhost:3000/api').trim();
  url = url.replace(/\/+$/, '');
  if (!url.endsWith('/api')) {
    url += '/api';
  }
  return url;
};

export const API_BASE_URL = getApiBaseUrl();

export const api = axios.create({
  baseURL: API_BASE_URL,
});

// Automatically attach Supabase access token to every request
api.interceptors.request.use(async (config) => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      config.headers.Authorization = `Bearer ${session.access_token}`;
    }
  } catch (err) {
    // Continue without token
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

export default api;
