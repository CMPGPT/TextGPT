import { NextRequest, NextResponse } from 'next/server';
import { getLogger } from '@/utils/logger';

// Initialize logger
const logger = getLogger('api:iqr:pdf-process-redirect');

// Use Node.js runtime for better performance and higher resource limits for POST
export const runtime = 'nodejs';
// Increase the timeout for larger documents
export const maxDuration = 300; // 5 minutes

/**
 * Redirect handler for legacy IQR PDF processing
 * This redirects to the centralized PDF manual endpoint
 */

export async function POST(req: NextRequest) {
  try {
    logger.info('Redirecting IQR PDF-process request to centralized pdf-manual endpoint');
    
    // Simply forward the request to the centralized pdf-manual endpoint
    const formData = await req.formData();
    
    // Add operation parameter to specify 'process' operation
    formData.append('operation', 'process');
    
    // Log the redirection
    logger.info('Forwarding request to pdf-manual endpoint', {
      hasFile: !!formData.get('file'),
      productId: formData.get('productId'),
      businessId: formData.get('businessId')
    });
    
    // Forward the request
    const response = await fetch(`${req.nextUrl.origin}/api/pdf-manual`, {
      method: 'POST',
      body: formData,
    });
    
    // Return the response directly
    const responseData = await response.json();
    
    logger.info('Response from pdf-manual endpoint', {
      success: responseData.success,
      status: response.status,
    });
    
    // Return the response with the same status code
    return NextResponse.json(responseData, {
      status: response.status,
    });
    
  } catch (error: any) {
    logger.error('Error in PDF process redirect:', error);
    return NextResponse.json({
      success: false,
      error: `Error redirecting request: ${error.message || 'Unknown error'}`,
    }, { status: 500 });
  }
}
