import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const businessId = searchParams.get('businessId');
    const userId = searchParams.get('userId');

    // Validation
    if (!businessId) {
      return NextResponse.json({ error: 'Business ID is required' }, { status: 400 });
    }

    const supabase = createRouteHandlerClient({ cookies });

    // Get the user_balance record
    const { data: balanceData, error: balanceError } = await supabase
      .from('user_balance')
      .select('*')
      .eq('business_id', businessId)
      .eq(userId ? 'user_id' : 'business_id', userId || businessId)
      .order('last_subscription_date', { ascending: false })
      .limit(1)
      .single();

    let userBalanceData = balanceData;
    
    // If no record was found or there was a "not found" error, create a new record
    if (!balanceData || (balanceError && balanceError.code === 'PGRST116')) {
      console.log(`No balance record found for business ID: ${businessId}, creating a new record`);
      
      // First, ensure the user exists in iqr_users table
      let validUserId = userId;
      
      if (userId) {
        // Check if the provided user_id exists in iqr_users
        const { data: userData, error: userError } = await supabase
          .from('iqr_users')
          .select('id')
          .eq('id', userId)
          .single();
          
        if (userError || !userData) {
          console.log(`User ID ${userId} not found in iqr_users table, falling back to business owner`);
          validUserId = null; // We'll use the business owner instead
        }
      }
      
      // If user not found or not provided, get the business owner's user_id
      if (!validUserId) {
        const { data: ownerData, error: ownerError } = await supabase
          .from('iqr_users')
          .select('id')
          .eq('business_id', businessId)
          .eq('role', 'owner')
          .single();
          
        if (ownerError || !ownerData) {
          console.error('Could not find business owner user:', ownerError);
          
          // As last resort, find any user associated with this business
          const { data: anyUser, error: anyUserError } = await supabase
            .from('iqr_users')
            .select('id')
            .eq('business_id', businessId)
            .limit(1)
            .single();
            
          if (anyUserError || !anyUser) {
            console.error('Could not find any user for this business:', anyUserError);
            return NextResponse.json({ 
              error: 'No valid user found for this business',
              success: false
            }, { status: 404 });
          }
          
          validUserId = anyUser.id;
        } else {
          validUserId = ownerData.id;
        }
      }
      
      console.log(`Using valid user ID for balance record: ${validUserId}`);
      
      // Check if a record already exists with this user_id and business_id
      const { data: existingBalance, error: _existingError } = await supabase
        .from('user_balance')
        .select('*')
        .eq('business_id', businessId)
        .eq('user_id', validUserId)
        .single();
        
      if (existingBalance) {
        console.log(`Found existing balance record for user ${validUserId} and business ${businessId}`);
        userBalanceData = existingBalance;
      } else {
        // Create a new record with the valid user_id
        const { data: newBalance, error: createError } = await supabase
          .from('user_balance')
          .insert([{
            business_id: businessId,
            user_id: validUserId,
            balance: 0,
            total_messages: 0,
            last_subscription_date: null,
            message_cost: 0.01
          }])
          .select()
          .single();
        
        if (createError) {
          console.error('Error creating balance record:', createError);
        } else {
          console.log('Created new balance record:', newBalance);
          userBalanceData = newBalance;
        }
      }
    } else if (balanceError) {
      console.error('Error fetching balance:', balanceError);
      return NextResponse.json({ error: 'Failed to fetch balance data' }, { status: 500 });
    }

    // Get total messages for this business
    let totalMessages = 0;
    try {
      const { count, error: messagesError } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('business_id', businessId);
      
      if (messagesError) {
        console.error('Error fetching message count:', messagesError);
      } else {
        totalMessages = count || 0;
      }
    } catch (error) {
      console.error('Error counting messages:', error);
      // Continue despite message count error
    }

    // Format the balance with dollar sign and two decimal places
    const formattedBalance = userBalanceData 
      ? `$${userBalanceData.balance.toFixed(2)}` 
      : '$0.00';

    // Format the date in YYYY-MM-DD format
    const formattedDate = userBalanceData?.last_subscription_date 
      ? new Date(userBalanceData.last_subscription_date).toISOString().split('T')[0]
      : 'No subscription';

    return NextResponse.json({
      success: true,
      balance: {
        creditValue: formattedBalance,
        lastSubscriptionDate: formattedDate,
        totalMessages: userBalanceData?.total_messages || totalMessages,
        rawBalance: userBalanceData?.balance || 0,
        messageCost: userBalanceData?.message_cost || 0.01
      }
    });

  } catch (error) {
    console.error('Error in balance API:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An unknown error occurred' },
      { status: 500 }
    );
  }
} 