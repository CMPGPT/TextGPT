export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      businesses: {
        Row: {
          id: string
          name: string
          ein: string | null
          address: string | null
          website_url: string | null
          support_email: string | null
          support_phone: string | null
          privacy_policy_url: string | null
          terms_of_service_url: string | null
          iqr_number: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          name: string
          ein?: string | null
          address?: string | null
          website_url?: string | null
          support_email?: string | null
          support_phone?: string | null
          privacy_policy_url?: string | null
          terms_of_service_url?: string | null
          iqr_number?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          ein?: string | null
          address?: string | null
          website_url?: string | null
          support_email?: string | null
          support_phone?: string | null
          privacy_policy_url?: string | null
          terms_of_service_url?: string | null
          iqr_number?: string | null
          created_at?: string | null
        }
      }
      iqr_users: {
        Row: {
          id: string
          business_id: string
          auth_uid: string
          role: string | null
          username: string
          password: string
          created_at: string | null
          full_name: string | null
        }
        Insert: {
          id?: string
          business_id: string
          auth_uid: string
          role?: string | null
          username: string
          password: string
          created_at?: string | null
          full_name?: string | null
        }
        Update: {
          id?: string
          business_id?: string
          auth_uid?: string
          role?: string | null
          username?: string
          password?: string
          created_at?: string | null
          full_name?: string | null
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_complete_profile: {
        Args: { user_auth_id: string }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
  }
} 