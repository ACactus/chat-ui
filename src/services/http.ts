import axios from "axios";

export const baseUrl = import.meta.env.VITE_BASE_URL;

export const http = axios.create({
  baseURL: baseUrl,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' }
});

// 自动解包后端统一响应 { code, message, data }
http.interceptors.response.use(
  (response) => {
    const payload = response.data;
    if (payload && typeof payload === 'object' && 'data' in payload && 'code' in payload) {
      if (payload.code === 200) {
        return payload.data;
      }
      // 非 200 统一抛错，message 兜底
      return Promise.reject(new Error(payload.message || '请求失败'));
    }
    return payload;
  },
  (error) => {
    return Promise.reject(error);
  }
);
  
  