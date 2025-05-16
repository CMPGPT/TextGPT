import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getLogger } from '@/utils/logger';

const logger = getLogger('api:debug:logs');

// Secure the logs endpoint with a simple API key check
const isAuthorized = (request: NextRequest): boolean => {
  const apiKey = process.env.DEBUG_API_KEY;
  
  // If DEBUG_API_KEY is not set, disable this feature
  if (!apiKey) {
    return false;
  }
  
  // Check authorization header
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return false;
  }
  
  const providedKey = authHeader.replace('Bearer ', '');
  return providedKey === apiKey;
};

export async function GET(request: NextRequest) {
  try {
    // Check authorization
    if (!isAuthorized(request)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const level = searchParams.get('level');
    const context = searchParams.get('context');
    const limit = parseInt(searchParams.get('limit') || '100', 10);
    const since = searchParams.get('since'); // ISO timestamp
    
    // Log this request
    logger.info('Logs request received', { level, context, limit, since });
    
    // Build query
    let query = supabaseAdmin
      .from('logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(Math.min(limit, 500)); // Limit to 500 max
    
    // Apply filters
    if (level) {
      query = query.eq('level', level);
    }
    
    if (since) {
      query = query.gte('created_at', since);
    }
    
    if (context) {
      query = query.filter('metadata->context', 'like', `%${context}%`);
    }
      
    // Execute query
    const { data, error } = await query;
    
    if (error) {
      logger.error('Error fetching logs', { error });
      return NextResponse.json(
        { error: 'Failed to fetch logs', details: error.message },
        { status: 500 }
      );
    }
    
    return NextResponse.json({
      success: true,
      logs: data,
      count: data.length,
      filters: { level, context, limit, since }
    });
    
  } catch (error) {
    logger.error('Unexpected error in logs API', { error });
    
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}

// Add POST method to create test logs
export async function POST(request: NextRequest) {
  try {
    // Check authorization
    if (!isAuthorized(request)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Parse the request body
    const body = await request.json();
    const { level = 'info', message, context = 'api:debug:logs:test', metadata = {} } = body;
    
    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }
    
    // Create test logger with specified context
    const testLogger = getLogger(context);
    
    // Log the message with appropriate level
    switch (level) {
      case 'debug':
        await testLogger.debug(message, metadata);
        break;
      case 'info':
        await testLogger.info(message, metadata);
        break;
      case 'warn':
        await testLogger.warn(message, metadata);
        break;
      case 'error':
        await testLogger.error(message, metadata);
        break;
      case 'fatal':
        await testLogger.fatal(message, metadata);
        break;
      default:
        await testLogger.info(message, metadata);
    }
    
    return NextResponse.json({
      success: true,
      message: 'Log created successfully',
      log: { level, message, context, metadata }
    });
    
  } catch (error) {
    logger.error('Error creating test log', { error });
    
    return NextResponse.json(
      { error: 'Failed to create test log' },
      { status: 500 }
    );
  }
} 