import axios from 'axios';
import { LoginRequest, RegisterRequest, LoginResponse, RegisterResponse } from '../types/auth';
import { ChatResponse } from '../types/chat';
import { Claim, ClaimStatusResponse, CreateClaimRequest } from '../types/claim';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:4000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('access_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authApi = {
  login: async (credentials: LoginRequest): Promise<LoginResponse> => {
    const response = await api.post('/auth/login', credentials);
    return response.data;
  },

  register: async (credentials: RegisterRequest): Promise<RegisterResponse> => {
    const response = await api.post('/auth/register', credentials);
    return response.data;
  },
};

export const chatApi = {
  sendMessage: async (message: string): Promise<ChatResponse> => {
    const response = await api.post('/chat', { message });
    return response.data;
  },
};

export const claimApi = {
  getAllClaims: async (): Promise<Claim[]> => {
    const response = await api.get('/claim/claims');
    return response.data;
  },

  getClaimStatus: async (claimId: number): Promise<ClaimStatusResponse> => {
    const response = await api.post('/claim/claim-status', { claim_id: claimId });
    return response.data;
  },
};

export default api;