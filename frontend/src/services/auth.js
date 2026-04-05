import api from './api';

export const loginUser = (email, password) =>
  api.post('/api/login/', { email, password });

export const registerUser = (data) =>
  api.post('/api/register/', data);

export const getProfile = () =>
  api.get('/api/profile/');

export const updateProfile = (data) =>
  api.put('/api/profile/', data);
