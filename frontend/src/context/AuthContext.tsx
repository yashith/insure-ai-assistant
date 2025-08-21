import React, { createContext, useContext, useState, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode';
import { User, LoginRequest, RegisterRequest } from '../types/auth';
import { authApi } from '../services/api';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  login: (credentials: LoginRequest) => Promise<void>;
  register: (credentials: RegisterRequest) => Promise<void>;
  logout: () => void;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check for existing token on mount
  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token) {
      try {
        const decoded: any = jwtDecode(token);
        
        // Check if token is expired
        if (decoded.exp * 1000 > Date.now()) {
          setUser({ username: decoded.username || decoded.sub });
        } else {
          localStorage.removeItem('access_token');
        }
      } catch (error) {
        localStorage.removeItem('access_token');
      }
    }
  }, []);

  const login = async (credentials: LoginRequest) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await authApi.login(credentials);
      const token = response.access_token;
      
      localStorage.setItem('access_token', token);
      
      const decoded: any = jwtDecode(token);
      setUser({ username: decoded.username || decoded.sub });
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Login failed';
      setError(errorMessage);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (credentials: RegisterRequest) => {
    setIsLoading(true);
    setError(null);
    
    try {
      await authApi.register(credentials);
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Registration failed';
      setError(errorMessage);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    setUser(null);
    setError(null);
  };

  const clearError = () => {
    setError(null);
  };

  const value: AuthContextType = {
    user,
    isLoading,
    error,
    login,
    register,
    logout,
    clearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};