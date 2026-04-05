import api from './api';

export const getCategories = () =>
  api.get('/api/categories/');

export const getJewelryItems = (params = {}) =>
  api.get('/api/jewelry/', { params });

export const getJewelryDetail = (id) =>
  api.get(`/api/jewelry/${id}/`);

export const getFavorites = () =>
  api.get('/api/favorites/');

export const addFavorite = (jewelry_item) =>
  api.post('/api/favorites/', { jewelry_item });

export const removeFavorite = (id) =>
  api.delete(`/api/favorites/${id}/`);
