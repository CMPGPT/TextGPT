import { User } from './index';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData extends LoginCredentials {
  name?: string;
  service: 'iqr' | 'kiwi' | 'both';
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface VerificationStatus {
  verified: boolean;
  email: string;
}

export interface ResetPasswordData {
  email: string;
}

export interface UpdatePasswordData {
  password: string;
  token: string;
}

export interface Session {
  user: User;
  expires: Date;
} 