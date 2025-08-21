export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
}

export interface RegisterResponse {
  message: string;
}

export interface User {
  username: string;
}

export interface AuthError {
  message: string;
  statusCode?: number;
}