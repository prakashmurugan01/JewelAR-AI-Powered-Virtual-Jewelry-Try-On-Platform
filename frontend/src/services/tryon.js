import api from './api';

export const detectLandmarks = (imageB64, detectHands = false) =>
  api.post('/api/tryon/detect/', { image: imageB64, detect_hands: detectHands });

export const processTryOn = (imageB64, jewelryItems) =>
  api.post('/api/tryon/process/', { image: imageB64, jewelry_items: jewelryItems });

export const detectEars = (imageB64) =>
  api.post('/api/detect-ears/', { image: imageB64 });

export const detectNeck = (imageB64) =>
  api.post('/api/detect-neck/', { image: imageB64 });

export const saveTryOnSnapshot = (data) =>
  api.post('/api/history/save/', data);

export const getTryOnHistory = () =>
  api.get('/api/history/');
