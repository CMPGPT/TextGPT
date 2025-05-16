import { NextRequest, NextResponse } from 'next/server';

// Mark this route as dynamic since it will make external API calls
export const dynamic = 'force-dynamic';

/**
 * API route to check connectivity with Mistral AI
 * 
 * This route makes a simple request to the Mistral API to verify:
 * 1. The API key is valid
 * 2. The connection to Mistral's API is working
 */
export async function GET(req: NextRequest) {
  try {
    // Check if Mistral API key is available in environment variables
    if (!process.env.MISTRAL_API_KEY) {
      console.error('[MISTRAL CHECK] Missing API key - MISTRAL_API_KEY is not set');
      return NextResponse.json({ 
        status: 'error', 
        message: 'Mistral API key is not configured',
        connected: false
      }, { status: 500 });
    }
    
    // Make a simple request to Mistral's API to verify connectivity
    // Using AbortController to set a timeout for the fetch request
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    try {
      console.log('[MISTRAL CHECK] Attempting to connect to Mistral API...');
      const response = await fetch('https://api.mistral.ai/v1/models', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${process.env.MISTRAL_API_KEY}`,
          'Content-Type': 'application/json'
        },
        signal: controller.signal
      });
      
      // Clear the timeout
      clearTimeout(timeoutId);
      
      // Check if the response is successful
      if (!response.ok) {
        const errorData = await response.text();
        console.error(`[MISTRAL CHECK] API Error: ${response.status} - ${errorData}`);
        
        // Return specific error for unauthorized (invalid API key)
        if (response.status === 401) {
          return NextResponse.json({ 
            status: 'error', 
            message: 'Invalid Mistral API key',
            connected: false
          }, { status: 401 });
        }
        
        return NextResponse.json({ 
          status: 'error', 
          message: `Mistral API error: ${response.status}`,
          errorDetails: errorData,
          connected: false
        }, { status: response.status });
      }
      
      // Parse the response to get available models
      const data = await response.json();
      console.log('[MISTRAL CHECK] Successfully connected to Mistral API');
      
      // Return success response with available models
      return NextResponse.json({ 
        status: 'success', 
        message: 'Successfully connected to Mistral API',
        connected: true,
        models: data.data ? data.data.map((model: any) => model.id) : [],
        apiVersion: response.headers.get('mistral-api-version') || 'unknown'
      });
    } catch (fetchError: any) {
      // Clear the timeout to prevent memory leaks
      clearTimeout(timeoutId);
      
      // Handle AbortError (timeout) specially
      if (fetchError.name === 'AbortError') {
        console.error('[MISTRAL CHECK] Request timed out after 10 seconds');
        return NextResponse.json({
          status: 'error',
          message: 'Connection to Mistral API timed out',
          connected: false,
          details: 'The request timed out. This might be due to network connectivity issues.'
        }, { status: 408 });
      }
      
      // Re-throw for other fetch errors to be caught by the outer try-catch
      throw fetchError;
    }
  } catch (error: any) {
    // Network errors like ENOTFOUND, ETIMEDOUT will be caught here
    console.error('[MISTRAL CHECK] Unexpected error:', error);
    
    // Prepare a user-friendly error message based on error type
    let errorMessage = 'An unexpected error occurred';
    let errorDetails = {};
    
    if (error.cause?.code) {
      // Common network error codes
      switch(error.cause.code) {
        case 'ENOTFOUND':
          errorMessage = 'Could not resolve Mistral API host';
          errorDetails = { hint: 'Check your DNS settings or internet connection' };
          break;
        case 'ETIMEDOUT':
          errorMessage = 'Connection to Mistral API timed out';
          errorDetails = { 
            hint: 'This may be due to network restrictions, firewall settings, or proxy configuration'
          };
          break;
        case 'ECONNREFUSED':
          errorMessage = 'Connection to Mistral API was refused';
          errorDetails = { hint: 'The server may be down or blocking your requests' };
          break;
        default:
          errorMessage = `Network error: ${error.cause.code}`;
          break;
      }
    }
    
    return NextResponse.json({ 
      status: 'error', 
      message: errorMessage,
      connected: false,
      details: {
        error: error.message,
        ...errorDetails
      }
    }, { status: 500 });
  }
} 