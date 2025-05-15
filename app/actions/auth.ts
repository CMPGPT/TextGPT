'use server';

import { createClient } from '@/lib/supabase/server';
import { SignupPayload, AuthResult } from '@/types/auth';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

/**
 * Register a new user and business
 */
export async function registerUser(payload: SignupPayload): Promise<AuthResult> {
  const supabase = createClient();
  
  try {
    // Step 1: Create the auth user with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: payload.user.email,
      password: payload.user.password,
      options: {
        data: {
          username: payload.user.username,
          full_name: payload.user.full_name || '',
        },
      },
    });

    if (authError) {
      console.error('Auth creation error:', authError);
      return {
        success: false,
        message: authError.message || 'Failed to create user account',
        error: authError
      };
    }

    if (!authData.user) {
      return {
        success: false,
        message: 'No user was created',
        error: new Error('No user created')
      };
    }

    // Step 2: Create the business record
    const { data: businessData, error: businessError } = await supabase
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
      // We can't delete the auth user easily in server action, but we'll note this for cleanup
      return {
        success: false,
        message: 'Failed to create business profile',
        error: businessError
      };
    }

    // Step 3: Create the IQR user record linking to both auth and business
    const { error: iqrUserError } = await supabase
      .from('iqr_users')
      .insert({
        business_id: businessData.id,
        auth_uid: authData.user.id,
        username: payload.user.username,
        full_name: payload.user.full_name || '',
        password: payload.user.password,  // Store the password properly
        role: 'owner'
      });

    if (iqrUserError) {
      console.error('IQR user creation error:', iqrUserError);
      return {
        success: false,
        message: 'Failed to create user profile',
        error: iqrUserError
      };
    }

    // Step 4: Create business additional details if provided
    let businessDetailsCreated = true;
    if (payload.businessDetails) {
      try {
        // Prepare business additional details with proper field handling
        const messageVolume = payload.businessDetails.message_volume === 'custom' ? 
          payload.businessDetails.custom_message_volume : 
          payload.businessDetails.message_volume;
          
        const businessDetailsData = {
          business_id: businessData.id,
          product_type: payload.businessDetails.product_type || null,
          business_size: payload.businessDetails.business_size || null,
          toll_free_use_case: payload.businessDetails.toll_free_use_case || null,
          message_volume: messageVolume || null
        };

        const { error: businessDetailsError } = await supabase
          .from('business_additional_details')
          .insert(businessDetailsData);

        if (businessDetailsError) {
          console.error('Business additional details creation error:', businessDetailsError);
          businessDetailsCreated = false;
          // Log the error but continue with registration as this is not critical
        }
      } catch (detailsError) {
        console.error('Error handling business additional details:', detailsError);
        businessDetailsCreated = false;
        // Continue with registration despite this error
      }
    }

    revalidatePath('/iqr/dashboard');

    return {
      success: true,
      message: 'Registration successful',
      data: {
        user: authData.user,
        business: businessData,
        iqr_number: businessData.iqr_number,
        isVerified: false,
        businessDetailsCreated
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
  const supabase = createClient();
  
  try {
    // Use Supabase Auth for sign-in
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      console.error('Auth signin error:', error);
      return {
        success: false,
        message: error.message || 'Invalid login credentials',
        error
      };
    }

    // No need to manually set cookie with createClient from auth-helpers-nextjs
    // as it handles cookie setting automatically
    
    // Fetch complete user profile with all associated data
    const { data: completeProfile, error: profileError } = await supabase
      .rpc('get_user_complete_profile', { user_auth_id: data.user.id });

    if (profileError) {
      console.error('User profile fetch error:', profileError);
      // Still return success since auth succeeded
      return {
        success: true,
        message: 'Login successful, but user profile could not be fetched',
        data: {
          user: data.user,
          session: data.session
        }
      };
    }

    revalidatePath('/iqr/dashboard');

    return {
      success: true,
      message: 'Login successful',
      data: {
        user: data.user,
        session: data.session,
        profile: completeProfile.user,
        business: completeProfile.business,
        businessDetails: completeProfile.business_details
      }
    };
  } catch (error) {
    console.error('Unexpected auth error:', error);
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
  const supabase = createClient();
  
  try {
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      return {
        success: false,
        message: error.message || 'Failed to sign out',
        error
      };
    }

    revalidatePath('/iqr/login');
    
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

/**
 * Get the current session
 */
export async function getSession() {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

/**
 * Check if the user is logged in and redirect if not
 */
export async function requireAuth(redirectTo = '/iqr/login') {
  const session = await getSession();
  
  if (!session) {
    redirect(redirectTo);
  }
  
  return session;
} 