'use server';

import { supabaseAdmin } from '@/lib/supabase';
import { SignupPayload, AuthResult } from '@/types/auth';
import { revalidatePath } from 'next/cache';
import { v4 as uuidv4 } from 'uuid';
import { cookies } from 'next/headers';

/**
 * Register a new user and business
 */
export async function registerUser(payload: SignupPayload): Promise<AuthResult> {
  try {
    // Step 1: Create the auth user
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: payload.user.email,
      password: payload.user.password,
      email_confirm: true,
    });

    if (authError) {
      console.error('Auth creation error:', authError);
      return {
        success: false,
        message: 'Failed to create user account',
        error: authError
      };
    }

    // Step 2: Create the business record
    const { data: businessData, error: businessError } = await supabaseAdmin
      .from('businesses')
      .insert({
        name: payload.business.name,
        ein: payload.business.ein,
        address: payload.business.address,
        website_url: payload.business.website_url || null,
        support_email: payload.business.support_email || null,
        support_phone: payload.business.support_phone || null,
        privacy_policy_url: payload.business.privacy_policy_url || null,
        terms_of_service_url: payload.business.terms_of_service_url || null,
        iqr_number: `+1${Math.floor(1000000000 + Math.random() * 9000000000)}`, // Generate a random 10-digit number with +1 prefix
      })
      .select()
      .single();

    if (businessError) {
      console.error('Business creation error:', businessError);
      // Clean up the auth user since business creation failed
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      return {
        success: false,
        message: 'Failed to create business profile',
        error: businessError
      };
    }

    // Step 3: Create the IQR user record linking to both auth and business
    const { error: iqrUserError } = await supabaseAdmin
      .from('iqr_users')
      .insert({
        business_id: businessData.id,
        auth_uid: authData.user.id,
        username: payload.user.username,
        password: payload.user.password, // Note: This should be hashed in a real implementation
        role: 'owner'
      });

    if (iqrUserError) {
      console.error('IQR user creation error:', iqrUserError);
      // Clean up previously created records
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      await supabaseAdmin.from('businesses').delete().eq('id', businessData.id);
      return {
        success: false,
        message: 'Failed to create user profile',
        error: iqrUserError
      };
    }

    // Step 4: Sign in the user automatically
    const { data: sessionData, error: signInError } = await supabaseAdmin.auth.signInWithPassword({
      email: payload.user.email,
      password: payload.user.password,
    });

    if (signInError) {
      console.error('Auto sign-in error:', signInError);
      // Continue anyway since the account was created successfully
    }

    revalidatePath('/iqr/dashboard');

    return {
      success: true,
      message: 'Registration successful',
      data: {
        user: authData.user,
        business: businessData,
        iqr_number: businessData.iqr_number,
        isVerified: false
      }
    };
  } catch (error) {
    console.error('Registration error:', error);
    return {
      success: false,
      message: 'An unexpected error occurred during registration',
      error
    };
  }
}

/**
 * Sign in a user
 */
export async function signIn(email: string, password: string): Promise<AuthResult> {
  try {
    const { data, error } = await supabaseAdmin.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return {
        success: false,
        message: 'Invalid login credentials',
        error
      };
    }

    revalidatePath('/iqr/dashboard');

    return {
      success: true,
      message: 'Login successful',
      data
    };
  } catch (error) {
    return {
      success: false,
      message: 'An unexpected error occurred',
      error
    };
  }
}

/**
 * Sign out the current user
 */
export async function signOut(): Promise<AuthResult> {
  try {
    const { error } = await supabaseAdmin.auth.signOut();

    if (error) {
      return {
        success: false,
        message: 'Failed to sign out',
        error
      };
    }

    revalidatePath('/auth/login');

    return {
      success: true,
      message: 'Signed out successfully'
    };
  } catch (error) {
    return {
      success: false,
      message: 'An unexpected error occurred',
      error
    };
  }
} 