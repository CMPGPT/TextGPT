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

export interface UserRegistrationData {
  username: string;
  email: string;
  password: string;
  full_name: string;
}

export interface BusinessRegistrationData {
  name: string;
  ein: string;
  address: string;
  website_url?: string;
  support_email?: string;
  support_phone?: string;
  privacy_policy_url?: string;
  terms_of_service_url?: string;
}

export interface BusinessDetailsData {
  product_type?: string;
  business_size?: string;
  toll_free_use_case?: string;
  message_volume?: string;
  custom_message_volume?: string; // Kept for form handling, but will be merged with message_volume in the backend
}

export interface SignupPayload {
  user: UserRegistrationData;
  business: BusinessRegistrationData;
  businessDetails?: BusinessDetailsData;
}

export interface AuthResult {
  success: boolean;
  message: string;
  error?: any;
  data?: any;
} 