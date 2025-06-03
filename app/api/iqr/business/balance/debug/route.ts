import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const businessId = searchParams.get('businessId');
    const userId = searchParams.get('userId');
    const includeRaw = searchParams.get('raw') === 'true';
    
    // Get current auth context for security check
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Get information about the current auth user
    const { data: authUserData, error: authUserError } = await supabase
      .from('iqr_users')
      .select('id, business_id, role, username, full_name')
      .eq('auth_uid', session.user.id)
      .single();
    
    // Find valid users for this business
    let validUsers = [];
    let businessOwner = null;
    
    if (businessId) {
      // Get all users for this business
      const { data: businessUsers, error: _businessUsersError } = await supabase
        .from('iqr_users')
        .select('id, role, username, full_name, auth_uid, business_id')
        .eq('business_id', businessId);
        
      if (businessUsers) {
        validUsers = businessUsers;
        businessOwner = businessUsers.find(user => user.role === 'owner');
      }
    }
    
    // Inspect user_balance table entries
    const balanceQuery = supabase
      .from('user_balance')
      .select('*');
      
    // Filter by businessId if provided
    if (businessId) {
      balanceQuery.eq('business_id', businessId);
    }
    
    // Filter by userId if provided
    if (userId) {
      balanceQuery.eq('user_id', userId);
    }
    
    const { data: balanceData, error: balanceError } = await balanceQuery;
    
    // Run the same query as the actual API would
    let simulatedApiResponse = null;
    if (businessId) {
      try {
        // Mimic the production API call
        const testQuery = supabase
          .from('user_balance')
          .select('*')
          .eq('business_id', businessId);
          
        if (userId) {
          testQuery.eq('user_id', userId);
        }
          
        testQuery.order('last_subscription_date', { ascending: false })
          .limit(1)
          .single();
          
        const { data: testData, error: testError } = await testQuery;
        
        // Also test if the user exists in iqr_users
        let userExists = false;
        let userDetails = null;
        
        if (userId) {
          const { data: userData, error: userError } = await supabase
            .from('iqr_users')
            .select('*')
            .eq('id', userId)
            .single();
            
          userExists = !!userData && !userError;
          userDetails = userData;
        }
        
        simulatedApiResponse = {
          result: testData,
          error: testError,
          userExists,
          userDetails,
          would_create_record: !testData && (testError?.code === 'PGRST116'),
          would_use_userId: userId && userExists ? userId : (businessOwner?.id || null)
        };
      } catch (simError) {
        simulatedApiResponse = {
          error: 'Simulation error',
          details: simError instanceof Error ? simError.message : String(simError)
        };
      }
    }
    
    // Get schema of user_balance table
    const { data: schemaData, error: schemaError } = await supabase
      .rpc('get_table_definition', { table_name: 'user_balance' });
    
    // Also check if the messages table exists and has business_id column
    const { data: messagesSchema, error: messagesSchemaError } = await supabase
      .rpc('get_table_definition', { table_name: 'messages' });
    
    // Get iqr_users schema
    const { data: usersSchema, error: usersSchemaError } = await supabase
      .rpc('get_table_definition', { table_name: 'iqr_users' });
    
    if (balanceError || schemaError) {
      return NextResponse.json({ 
        error: 'Error fetching data', 
        balanceError,
        schemaError
      }, { status: 500 });
    }
    
    const response = {
      user_balance: {
        data: balanceData,
        count: balanceData?.length || 0,
        schema: schemaData
      },
      messages_table: {
        schema: messagesSchema,
        error: messagesSchemaError
      },
      users_table: {
        schema: usersSchema,
        error: usersSchemaError,
        user_count: validUsers.length,
        business_owner: businessOwner
      },
      current_user: {
        id: session.user.id,
        email: session.user.email,
        iqr_user: authUserData,
        error: authUserError
      },
      simulation: simulatedApiResponse,
      debug_info: {
        timestamp: new Date().toISOString(),
        requestedBusinessId: businessId,
        requestedUserId: userId
      }
    };
    
    // Remove potentially sensitive raw data if not explicitly requested
    if (!includeRaw) {
      if (response.user_balance.data) {
        response.user_balance.data = response.user_balance.data.map(item => ({
          id: item.id,
          user_id: item.user_id,
          business_id: item.business_id,
          balance: item.balance,
          last_subscription_date: item.last_subscription_date,
          total_messages: item.total_messages,
          message_cost: item.message_cost
        }));
      }
      
      if (response.users_table.business_owner) {
        response.users_table.business_owner = {
          id: response.users_table.business_owner.id,
          role: response.users_table.business_owner.role
        } as any;
      }
    }

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error in balance debug API:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An unknown error occurred' },
      { status: 500 }
    );
  }
} 