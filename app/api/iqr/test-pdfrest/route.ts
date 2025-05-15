import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Endpoint to test PDFRest API connectivity and response format
 */
export async function GET(request: NextRequest) {
  try {
    // Get API key from environment variables
    const apiKey = process.env.PDFREST_API_KEY || '39e40ab2-0b04-40d0-9a80-b7ae5d5493ca';
    
    // Create a simple test PDF in memory
    const formData = new FormData();
    
    // Create a simple PDF blob (not a real PDF, just for testing)
    const pdfContent = '%PDF-1.5\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R>>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R>>\nendobj\n4 0 obj\n<< /Length 44 >>\nstream\nBT /F1 12 Tf 100 700 Td (Test PDF Content) Tj ET\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f\n0000000010 00000 n\n0000000058 00000 n\n0000000115 00000 n\n0000000198 00000 n\ntrailer\n<< /Size 5 /Root 1 0 R >>\nstartxref\n293\n%%EOF';
    
    const pdfBlob = new Blob([pdfContent], { type: 'application/pdf' });
    formData.append('file', pdfBlob, 'test.pdf');
    
    // Add full_text parameter to request full text
    formData.append('full_text', 'document');
    
    // Log request
    console.log('Testing PDFRest API with sample PDF');
    
    // Call PDFRest API
    const response = await fetch('https://api.pdfrest.com/extracted-text', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Api-Key': apiKey
      },
      body: formData
    });
    
    // Log response status
    console.log(`PDFRest API response status: ${response.status}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json({
        success: false,
        error: `PDFRest API error: ${response.status} - ${errorText}`,
        apiKey: `${apiKey.substring(0, 5)}...${apiKey.substring(apiKey.length - 5)}`
      });
    }
    
    // Parse response
    const result = await response.json();
    
    // Check response structure
    const responseKeys = Object.keys(result);
    console.log('PDFRest API response keys:', responseKeys);
    
    // Check for text content in the response
    const hasText = typeof result.text === 'string';
    const hasFullText = typeof result.fullText === 'string';
    const textContent = hasText ? result.text : (hasFullText ? result.fullText : null);
    
    // Check for message about free account limitations
    const hasFreeAccountMessage = 
      result.message && 
      typeof result.message === 'string' && 
      (result.message.includes('free account') || result.message.includes('watermarked') || result.message.includes('redacted'));
    
    // Return the detailed diagnostics
    return NextResponse.json({
      success: true,
      responseData: result,
      apiKeyUsed: `${apiKey.substring(0, 5)}...${apiKey.substring(apiKey.length - 5)}`,
      diagnostics: {
        responseKeys,
        hasText,
        hasFullText,
        textContentLength: textContent ? textContent.length : 0,
        textContentSample: textContent ? textContent.substring(0, 100) + '...' : null,
        hasFreeAccountMessage,
        message: result.message || null
      },
      recommendations: hasFreeAccountMessage 
        ? ["The PDFRest free tier is limiting your results. Consider upgrading to a paid plan to get full text extraction."] 
        : []
    });
    
  } catch (error) {
    console.error('Test PDFRest API Error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'An unexpected error occurred',
        errorDetail: (error as Error).message,
        errorStack: (error as Error).stack
      },
      { status: 500 }
    );
  }
} 