import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// Mark this route as dynamic since it uses request.url
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }
    
    // Get user data
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('name, age, occupation, hobby, is_deleted')
      .eq('id', userId)
      .single();
    
    if (error) {
      console.error('[USER API] Error fetching user data:', error);
      return NextResponse.json({ error: 'Failed to fetch user data' }, { status: 500 });
    }
    
    if (data.is_deleted) {
      return NextResponse.json({ error: 'User account has been deleted' }, { status: 404 });
    }
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('[USER API] Unexpected error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { userId, data } = await req.json();
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }
    
    if (!data || Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'No data provided for update' }, { status: 400 });
    }
    
    // Only allow updating these fields
    const allowedFields = ['name', 'age', 'occupation', 'hobby', 'is_deleted'];
    const updateData: Record<string, any> = {};
    
    for (const key of Object.keys(data)) {
      if (allowedFields.includes(key)) {
        updateData[key] = data[key];
      }
    }
    
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }
    
    // Update user data
    const { data: updatedData, error } = await supabaseAdmin
      .from('users')
      .update(updateData)
      .eq('id', userId)
      .select()
      .single();
    
    if (error) {
      console.error('[USER API] Error updating user data:', error);
      return NextResponse.json({ error: 'Failed to update user data' }, { status: 500 });
    }
    
    return NextResponse.json(updatedData);
  } catch (error) {
    console.error('[USER API] Unexpected error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }
    
    // Soft delete user by setting is_deleted to true and clearing personal data
    const { data: _data, error } = await supabaseAdmin
      .from('users')
      .update({ 
        is_deleted: true,
        name: null,
        age: null,
        occupation: null,
        hobby: null
      })
      .eq('id', userId)
      .select()
      .single();
    
    if (error) {
      console.error('[USER API] Error deleting user data:', error);
      return NextResponse.json({ error: 'Failed to delete user data' }, { status: 500 });
    }
    
    // Delete chat history
    const { error: deleteChatsError } = await supabaseAdmin
      .from('chat_messages')
      .delete()
      .eq('user_id', userId);
    
    if (deleteChatsError) {
      console.error('[USER API] Error deleting chat history:', deleteChatsError);
      // Continue with the operation even if history deletion fails
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[USER API] Unexpected error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
} 