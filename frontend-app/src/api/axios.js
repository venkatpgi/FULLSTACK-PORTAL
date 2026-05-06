import axios from "axios";

const api = axios.create({
  baseURL: "http://127.0.0.1:8000", // ✅ FIXED
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,

  (error) => {
    const isAuthRoute =
      error.config?.url?.includes("/auth/login");

    // 🔥 HANDLE 401 (existing)
    if (error.response?.status === 401 && !isAuthRoute) {
      localStorage.removeItem("token");
      window.location.href = "/login";
    }

    // 🔥 HANDLE 404 (NEW FIX)
    if (error.response?.status === 404) {
      console.log("⚠️ 404 handled safely:", error.config?.url);

      // return safe response instead of throwing error
      return Promise.resolve({ data: null });
    }

    return Promise.reject(error);
  }
);

export default api;