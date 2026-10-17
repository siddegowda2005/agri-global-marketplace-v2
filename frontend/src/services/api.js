import axios from 'axios';
export const TOKEN_KEY = 'agri_token';
const api = axios.create({ baseURL: `${import.meta.env.VITE_API_URL || ''}/api`, timeout: 15000 });
api.interceptors.request.use((cfg) => { const t = localStorage.getItem(TOKEN_KEY); if (t) cfg.headers.Authorization = `Bearer ${t}`; return cfg; });
export const errMsg = (e) => e?.response?.data?.details?.[0] ? `${e.response.data.message}: ${e.response.data.details[0].path} ${e.response.data.details[0].message}` : e?.response?.data?.message || (e?.code === 'ECONNABORTED' ? 'Request timed out' : e?.message === 'Network Error' ? 'Cannot reach the server' : 'Something went wrong');
export const imgUrl = (p) => (p ? `${import.meta.env.VITE_API_URL || ''}${p}` : null);
export default api;
