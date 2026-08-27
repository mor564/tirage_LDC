import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
});

export const fetchPots = () => api.get('/teams/pots').then(response => response.data);
export const fetchLatestDraw = () => api.get('/draw/latest').then(response => response.data);
export const runDraw = seed =>
  api.post('/draw/perform', seed === undefined ? {} : { seed }).then(response => response.data);
export const fetchAudit = () => api.get('/draw/audit').then(response => response.data);

export default api;
