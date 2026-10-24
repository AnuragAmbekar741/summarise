import axios from 'axios';

// One axios instance for every call to the service.
export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:3000',
});
