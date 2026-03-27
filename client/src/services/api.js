import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "https://golf-charity-platform-8.onrender.com/api",
  withCredentials: true
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("authToken");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

export const authApi = {
  register: (payload) => api.post("/auth/register", payload),
  registerAdmin: (payload) => api.post("/auth/register-admin", payload),
  login: (payload) => api.post("/auth/login", payload),
  forgotPassword: (payload) => api.post("/auth/forgot-password", payload),
  resetPassword: (payload) => api.post("/auth/reset-password", payload),
  changePassword: (payload) => api.post("/auth/change-password", payload),
  guestLogin: () => api.post("/auth/guest-login"),
  refresh: () => api.post("/auth/refresh"),
  logout: () => api.post("/auth/logout"),
  me: () => api.get("/auth/me")
};

export const subscriptionApi = {
  create: (payload) => api.post("/subscriptions", payload),
  updateStatus: (payload) => api.patch("/subscriptions/status", payload),
  getStatus: () => api.get("/subscriptions/status")
};

export const scoresApi = {
  list: () => api.get("/scores"),
  add: (payload) => api.post("/scores", payload)
};

export const drawsApi = {
  getLatest: () => api.get("/draws/monthly/latest"),
  getHistory: (params = {}) => api.get("/draws/monthly/history", { params }),
  runMonthly: (payload = {}) => api.post("/draws/monthly/run", payload)
};

export const charityApi = {
  list: (params = {}) => api.get("/charities", { params }),
  getById: (id) => api.get(`/charities/${id}`),
  create: (payload) => api.post("/charities", payload),
  update: (id, payload) => api.put(`/charities/${id}`, payload),
  remove: (id) => api.delete(`/charities/${id}`)
};

export const userApi = {
  updateMyCharity: (payload) => api.patch("/users/me/charity", payload)
};

export const adminApi = {
  users: {
    list: () => api.get("/admin/users"),
    update: (id, payload) => api.patch(`/admin/users/${id}`, payload),
    remove: (id) => api.delete(`/admin/users/${id}`)
  },
  scores: {
    list: (params = {}) => api.get("/admin/scores", { params }),
    update: (id, payload) => api.patch(`/admin/scores/${id}`, payload)
  },
  subscriptions: {
    list: (params = {}) => api.get("/admin/subscriptions", { params }),
    update: (id, payload) => api.patch(`/admin/subscriptions/${id}`, payload)
  },
  draws: {
    list: () => api.get("/admin/draws"),
    winners: (drawId) => api.get(`/admin/draws/${drawId}/winners`),
    markPayout: (drawId, tier, userId, payload) =>
      api.patch(`/admin/draws/${drawId}/winners/${tier}/${userId}/payout`, payload)
  },
  charities: {
    list: () => api.get("/admin/charities")
  }
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config || {};
    const status = error.response?.status;
    const url = originalRequest.url || "";

    if (
      status === 401 &&
      !originalRequest._retry &&
      !url.includes("/auth/refresh") &&
      !url.includes("/auth/login") &&
      !url.includes("/auth/forgot-password") &&
      !url.includes("/auth/reset-password") &&
      !url.includes("/auth/register")
    ) {
      try {
        originalRequest._retry = true;
        const refreshResponse = await api.post("/auth/refresh");
        const token = refreshResponse.data.accessToken || refreshResponse.data.token;

        if (token) {
          localStorage.setItem("authToken", token);
        }

        return api(originalRequest);
      } catch (refreshError) {
        localStorage.removeItem("authToken");
        localStorage.removeItem("authUser");
      }
    }

    return Promise.reject(error);
  }
);

export default api;
