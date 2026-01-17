import axios, { AxiosError, AxiosInstance } from 'axios';
import { useAuthStore } from '../stores/authStore';

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

/**
 * Create configured axios instance for API calls.
 */
function createApiClient(): AxiosInstance {
  const client = axios.create({
    baseURL: `${API_BASE_URL}/api/v1`,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // Request interceptor: add auth token
  client.interceptors.request.use((config) => {
    const token = useAuthStore.getState().accessToken;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  // Response interceptor: handle token refresh
  client.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      const originalRequest = error.config;

      // If 401 and we have a refresh token, try to refresh
      if (error.response?.status === 401 && originalRequest) {
        const refreshToken = useAuthStore.getState().refreshToken;

        if (refreshToken) {
          try {
            const response = await axios.post(
              `${API_BASE_URL}/api/v1/auth/refresh`,
              { refresh_token: refreshToken }
            );

            const { access_token, refresh_token } = response.data.data;
            useAuthStore.getState().setTokens(access_token, refresh_token);

            // Retry original request with new token
            originalRequest.headers.Authorization = `Bearer ${access_token}`;
            return client(originalRequest);
          } catch {
            // Refresh failed, logout
            useAuthStore.getState().logout();
          }
        }
      }

      return Promise.reject(error);
    }
  );

  return client;
}

export const api = createApiClient();

// --- Auth API ---

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
}

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    name: string;
  };
  tokens: {
    access_token: string;
    refresh_token: string;
  };
}

export const authApi = {
  login: (data: LoginRequest) =>
    api.post<{ success: boolean; data: AuthResponse }>('/auth/login', data),

  register: (data: RegisterRequest) =>
    api.post<{ success: boolean; data: AuthResponse }>('/auth/register', data),

  logout: () => api.post('/auth/logout'),
};

// --- Roster API ---

export interface Roster {
  id: string;
  name: string;
  encrypted_data: string;
  encryption_iv: string;
  created_at: string;
  updated_at: string;
}

export interface CreateRosterRequest {
  name: string;
  encrypted_data: string;
  encryption_iv: string;
}

export const rosterApi = {
  list: () => api.get<{ success: boolean; data: Roster[] }>('/rosters'),

  get: (id: string) => api.get<{ success: boolean; data: Roster }>(`/rosters/${id}`),

  create: (data: CreateRosterRequest) =>
    api.post<{ success: boolean; data: Roster }>('/rosters', data),

  update: (id: string, data: Partial<CreateRosterRequest>) =>
    api.put<{ success: boolean; data: Roster }>(`/rosters/${id}`, data),

  delete: (id: string) => api.delete(`/rosters/${id}`),
};

// --- AI API ---

export interface BellringerRequest {
  topic: string;
  subject: string;
  grade_level: string;
  learning_objective?: string;
  format_preference?: string;
  difficulty?: string;
  count?: number;
}

export interface LessonPlanRequest {
  topic: string;
  subject: string;
  grade_level: string;
  duration_minutes?: number;
  standards?: string[];
  additional_context?: string;
}

export interface RubricRequest {
  assignment_description: string;
  criteria: string[];
  rubric_type?: string;
  scale?: number;
  grade_level: string;
}

export const aiApi = {
  generateBellringer: (data: BellringerRequest) =>
    api.post('/ai/bellringer', data),

  generateLessonPlan: (data: LessonPlanRequest) =>
    api.post('/ai/lesson', data),

  generateRubric: (data: RubricRequest) =>
    api.post('/ai/rubric', data),

  healthCheck: () => api.get('/ai/health'),
};

// --- Timer API (public) ---

export const timerApi = {
  getDefaultPresets: () =>
    api.get('/timers/presets/default'),

  getEmbedConfig: (params: {
    duration?: number;
    theme?: string;
    sound?: string;
    auto_start?: boolean;
  }) => api.get('/timers/embed', { params }),
};
